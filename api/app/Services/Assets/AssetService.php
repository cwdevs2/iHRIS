<?php

declare(strict_types=1);

namespace App\Services\Assets;

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetMaintenanceLog;
use App\Services\Audit\AuditLogger;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AssetService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Paginated asset listing with optional filters.
     *
     * @param  array{status?:string,category_id?:string,search?:string}  $filters
     */
    public function list(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        return Asset::query()
            ->with(['category:id,name', 'assignments' => function ($q): void {
                $q->whereNull('returned_on')->with('employee.user:id,first_name,last_name');
            }])
            ->when($filters['status'] ?? null, fn (Builder $q, string $s) => $q->where('status', $s))
            ->when($filters['category_id'] ?? null, fn (Builder $q, string $c) => $q->where('category_id', $c))
            ->when($filters['search'] ?? null, function (Builder $q, string $s): void {
                $q->where(function ($qq) use ($s): void {
                    $qq->where('asset_tag', 'like', "%{$s}%")
                        ->orWhere('name', 'like', "%{$s}%")
                        ->orWhere('serial_number', 'like', "%{$s}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function create(array $data): Asset
    {
        $asset = DB::transaction(function () use ($data) {
            $asset = Asset::create($data);
            $this->audit->log('assets.asset.created', $asset, after: $asset->only($asset->getFillable()));
            return $asset;
        });

        return $asset->fresh(['category']);
    }

    public function update(Asset $asset, array $data): Asset
    {
        $before = $asset->only($asset->getFillable());
        $asset->update($data);
        $this->audit->log('assets.asset.updated', $asset, before: $before, after: $asset->fresh()->only($asset->getFillable()));

        return $asset->fresh(['category']);
    }

    public function retire(Asset $asset, ?string $reason = null): Asset
    {
        if ($asset->activeAssignment() !== null) {
            throw new RuntimeException('Cannot retire an asset that is currently assigned. Return it first.');
        }

        $before = $asset->only(['status', 'notes']);
        $asset->update([
            'status' => 'retired',
            'notes' => $reason ?? $asset->notes,
        ]);
        $this->audit->log('assets.asset.retired', $asset, before: $before, after: $asset->only(['status', 'notes']));

        return $asset->fresh();
    }

    /**
     * Assign an asset to an employee. Closes any prior open assignment defensively.
     */
    public function assign(Asset $asset, string $employeeId, ?string $notes = null): AssetAssignment
    {
        if ($asset->status === 'retired') {
            throw new RuntimeException('Retired assets cannot be assigned.');
        }
        if ($asset->activeAssignment() !== null) {
            throw new RuntimeException('Asset already has an active assignment. Return it first.');
        }

        return DB::transaction(function () use ($asset, $employeeId, $notes) {
            $assignment = AssetAssignment::create([
                'asset_id' => $asset->id,
                'employee_id' => $employeeId,
                'assigned_by' => Auth::id(),
                'assigned_on' => Carbon::today(),
                'notes' => $notes,
            ]);

            $asset->update(['status' => 'assigned']);

            $this->audit->log('assets.assignment.created', $assignment, after: $assignment->only($assignment->getFillable()));
            return $assignment;
        });
    }

    public function returnAsset(AssetAssignment $assignment, ?string $condition = null, ?string $notes = null): AssetAssignment
    {
        if ($assignment->returned_on !== null) {
            throw new RuntimeException('This assignment is already closed.');
        }

        return DB::transaction(function () use ($assignment, $condition, $notes) {
            $before = $assignment->only(['returned_on', 'returned_to', 'return_condition', 'notes']);
            $assignment->update([
                'returned_on' => Carbon::today(),
                'returned_to' => Auth::id(),
                'return_condition' => $condition,
                'notes' => $notes ?? $assignment->notes,
            ]);

            $assignment->asset->update([
                'status' => 'available',
                'condition' => $condition ?? $assignment->asset->condition,
            ]);

            $this->audit->log('assets.assignment.returned', $assignment, before: $before, after: $assignment->fresh()->only(['returned_on', 'returned_to', 'return_condition', 'notes']));
            return $assignment->fresh();
        });
    }

    public function logMaintenance(Asset $asset, array $data): AssetMaintenanceLog
    {
        $log = DB::transaction(function () use ($asset, $data) {
            $log = AssetMaintenanceLog::create([
                'asset_id' => $asset->id,
                'logged_by' => Auth::id(),
                ...$data,
            ]);

            // Move asset to maintenance for repair/upgrade types so lifecycle reflects reality.
            if (in_array($data['type'] ?? null, ['repair', 'upgrade'], true) && $asset->status === 'available') {
                $asset->update(['status' => 'under_maintenance']);
            }

            $this->audit->log('assets.maintenance.logged', $log, after: $log->only($log->getFillable()));
            return $log;
        });

        return $log->fresh();
    }
}

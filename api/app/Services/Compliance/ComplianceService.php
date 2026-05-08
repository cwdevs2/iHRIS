<?php

declare(strict_types=1);

namespace App\Services\Compliance;

use App\Models\CompliancePolicy;
use App\Models\Employee;
use App\Models\PolicyAcknowledgment;
use App\Models\RegulatoryFiling;
use App\Services\Audit\AuditLogger;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ComplianceService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** @param  array{category?:string,status?:string,search?:string}  $filters */
    public function listPolicies(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        return CompliancePolicy::query()
            ->with('publisher:id,first_name,last_name')
            ->withCount('acknowledgments')
            ->when($filters['category'] ?? null, fn (Builder $q, string $c) => $q->where('category', $c))
            ->when($filters['status'] ?? null, fn (Builder $q, string $s) => $q->where('status', $s))
            ->when($filters['search'] ?? null, fn (Builder $q, string $s) => $q->where('title', 'like', "%{$s}%"))
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function createPolicy(array $data): CompliancePolicy
    {
        $policy = CompliancePolicy::create([
            ...$data,
            'status' => $data['status'] ?? 'draft',
            'version' => $data['version'] ?? 1,
        ]);
        $this->audit->log('compliance.policy.created', $policy, after: $policy->only($policy->getFillable()));
        return $policy;
    }

    public function updatePolicy(CompliancePolicy $policy, array $data): CompliancePolicy
    {
        if ($policy->status === 'published' && isset($data['body'])) {
            throw new RuntimeException('Published policies are immutable. Create a new version instead.');
        }

        $before = $policy->only($policy->getFillable());
        $policy->update($data);
        $this->audit->log('compliance.policy.updated', $policy, before: $before, after: $policy->fresh()->only($policy->getFillable()));
        return $policy->fresh();
    }

    public function publishPolicy(CompliancePolicy $policy): CompliancePolicy
    {
        if ($policy->status === 'published') {
            return $policy;
        }

        $before = $policy->only(['status', 'published_by', 'published_at']);
        $policy->update([
            'status' => 'published',
            'published_by' => Auth::id(),
            'published_at' => now(),
        ]);
        $this->audit->log('compliance.policy.published', $policy, before: $before, after: $policy->only(['status', 'published_by', 'published_at']));
        return $policy->fresh();
    }

    public function acknowledgePolicy(CompliancePolicy $policy, Employee $employee): PolicyAcknowledgment
    {
        if ($policy->status !== 'published') {
            throw new RuntimeException('Only published policies can be acknowledged.');
        }

        $existing = PolicyAcknowledgment::where('policy_id', $policy->id)
            ->where('employee_id', $employee->id)
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        $ack = DB::transaction(function () use ($policy, $employee) {
            $ack = PolicyAcknowledgment::create([
                'policy_id' => $policy->id,
                'employee_id' => $employee->id,
                'acknowledged_at' => now(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
            $this->audit->log('compliance.policy.acknowledged', $ack, after: $ack->only(['policy_id', 'employee_id', 'acknowledged_at']));
            return $ack;
        });

        return $ack;
    }

    /**
     * Compliance dashboard: per-policy acknowledgement coverage.
     *
     * @return array<int,array{policy_id:string,title:string,acknowledged:int,outstanding:int,coverage_pct:float}>
     */
    public function acknowledgmentCoverage(): array
    {
        $totalEmployees = max(1, Employee::query()->whereNull('deleted_at')->count());

        return CompliancePolicy::query()
            ->where('status', 'published')
            ->where('requires_acknowledgment', true)
            ->withCount('acknowledgments')
            ->orderByDesc('published_at')
            ->get()
            ->map(fn (CompliancePolicy $p) => [
                'policy_id' => $p->id,
                'title' => $p->title,
                'category' => $p->category,
                'acknowledged' => (int) $p->acknowledgments_count,
                'outstanding' => max(0, $totalEmployees - (int) $p->acknowledgments_count),
                'coverage_pct' => round(($p->acknowledgments_count / $totalEmployees) * 100, 2),
            ])
            ->values()
            ->all();
    }

    /** @param  array{agency?:string,status?:string,due_within_days?:int}  $filters */
    public function listFilings(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        return RegulatoryFiling::query()
            ->with('filer:id,first_name,last_name')
            ->when($filters['agency'] ?? null, fn (Builder $q, string $a) => $q->where('agency', $a))
            ->when($filters['status'] ?? null, fn (Builder $q, string $s) => $q->where('status', $s))
            ->when(
                $filters['due_within_days'] ?? null,
                fn (Builder $q, int $days) => $q->whereBetween('due_on', [Carbon::today(), Carbon::today()->addDays($days)])
            )
            ->orderBy('due_on')
            ->paginate($perPage);
    }

    public function createFiling(array $data): RegulatoryFiling
    {
        $filing = RegulatoryFiling::create($data);
        $this->audit->log('compliance.filing.created', $filing, after: $filing->only($filing->getFillable()));
        return $filing;
    }

    public function markFiled(RegulatoryFiling $filing, array $data): RegulatoryFiling
    {
        $before = $filing->only(['status', 'filed_on', 'reference_number', 'filed_by']);
        $filing->update([
            'status' => 'filed',
            'filed_on' => $data['filed_on'] ?? Carbon::today(),
            'reference_number' => $data['reference_number'] ?? null,
            'filed_by' => Auth::id(),
            'notes' => $data['notes'] ?? $filing->notes,
        ]);
        $this->audit->log('compliance.filing.completed', $filing, before: $before, after: $filing->fresh()->only(['status', 'filed_on', 'reference_number', 'filed_by']));
        return $filing->fresh();
    }

    /**
     * Auto-flag overdue filings. Idempotent — safe to run from a scheduler.
     */
    public function flagOverdueFilings(): int
    {
        return RegulatoryFiling::query()
            ->where('status', 'pending')
            ->where('due_on', '<', Carbon::today())
            ->update(['status' => 'overdue']);
    }
}

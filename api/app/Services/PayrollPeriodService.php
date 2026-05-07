<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PayrollPeriod;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class PayrollPeriodService
{
    public function __construct(private AuditLogger $audit) {}

    public function paginate(array $filters = []): LengthAwarePaginator
    {
        $perPage = min((int) ($filters['per_page'] ?? 15), 100);

        return PayrollPeriod::query()
            ->withCount('runs')
            ->when(isset($filters['status']), fn (Builder $q) => $q->where('status', $filters['status']))
            ->when(isset($filters['frequency']), fn (Builder $q) => $q->where('frequency', $filters['frequency']))
            ->when(isset($filters['date_from']), fn (Builder $q) => $q->where('period_start', '>=', $filters['date_from']))
            ->when(isset($filters['date_to']), fn (Builder $q) => $q->where('period_end', '<=', $filters['date_to']))
            ->orderByDesc('period_start')
            ->paginate($perPage);
    }

    public function find(string $id): PayrollPeriod
    {
        $period = PayrollPeriod::withCount('runs')->find($id);
        if (! $period) {
            abort(404, 'Payroll period not found.');
        }
        return $period;
    }

    public function create(array $data, User $actor): PayrollPeriod
    {
        $period = PayrollPeriod::create($data);

        $this->audit->log(
            'payroll.period.created',
            target: $period,
            after: $period->toArray(),
            actor: $actor,
        );

        return $period;
    }

    public function update(string $id, array $data, User $actor): PayrollPeriod
    {
        $period = $this->find($id);
        $before = $period->toArray();

        $period->fill($data)->save();

        $this->audit->log(
            'payroll.period.updated',
            target: $period,
            before: $before,
            after: $period->fresh()->toArray(),
            actor: $actor,
        );

        return $period->fresh();
    }

    public function delete(string $id, User $actor): void
    {
        $period = $this->find($id);

        if ($period->runs()->exists()) {
            abort(409, 'Cannot delete a period that has payroll runs. Cancel or archive the runs first.');
        }

        $this->audit->log(
            'payroll.period.deleted',
            target: $period,
            before: $period->toArray(),
            actor: $actor,
        );

        $period->delete();
    }
}

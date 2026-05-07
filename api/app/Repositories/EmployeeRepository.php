<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Employee;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class EmployeeRepository
{
    /**
     * Paginate employees with optional filters.
     *
     * @param  array{
     *   search?: string,
     *   department_id?: string,
     *   position_id?: string,
     *   employment_status?: string,
     *   per_page?: int,
     *   page?: int,
     *   sort?: string,
     *   direction?: 'asc'|'desc',
     * } $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        $perPage = min((int) ($filters['per_page'] ?? 15), 100);
        $sort = $filters['sort'] ?? 'created_at';
        $direction = $filters['direction'] ?? 'desc';

        $allowedSorts = ['employee_number', 'date_hired', 'employment_status', 'basic_salary', 'created_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }

        return Employee::query()
            ->with(['user', 'department', 'position', 'manager.user'])
            ->when(isset($filters['search']) && $filters['search'] !== '', function (Builder $q) use ($filters) {
                $term = '%'.addcslashes($filters['search'], '%_').'%';
                $q->whereHas('user', fn (Builder $uq) =>
                    $uq->where('first_name', 'like', $term)
                        ->orWhere('last_name', 'like', $term)
                        ->orWhere('email', 'like', $term),
                )->orWhere('employee_number', 'like', $term);
            })
            ->when(isset($filters['department_id']), fn (Builder $q) =>
                $q->where('department_id', $filters['department_id']),
            )
            ->when(isset($filters['position_id']), fn (Builder $q) =>
                $q->where('position_id', $filters['position_id']),
            )
            ->when(isset($filters['employment_status']), fn (Builder $q) =>
                $q->where('employment_status', $filters['employment_status']),
            )
            ->orderBy($sort, $direction)
            ->paginate($perPage);
    }

    public function findById(string $id): ?Employee
    {
        return Employee::with(['user', 'department', 'position', 'manager.user'])->find($id);
    }

    public function findByEmployeeNumber(string $number): ?Employee
    {
        return Employee::where('employee_number', $number)->first();
    }

    public function create(array $data): Employee
    {
        return Employee::create($data);
    }

    public function update(Employee $employee, array $data): Employee
    {
        $employee->fill($data)->save();

        return $employee->fresh(['user', 'department', 'position', 'manager.user']);
    }

    public function softDelete(Employee $employee): void
    {
        $employee->delete();
    }

    /**
     * Generate the next sequential employee number.
     * Format: EMP-XXXX (configurable prefix, zero-padded to 4 digits).
     */
    public function nextEmployeeNumber(string $prefix = 'EMP'): string
    {
        $latest = Employee::withTrashed()
            ->where('employee_number', 'like', "{$prefix}-%")
            ->orderByRaw("CAST(SUBSTRING_INDEX(employee_number, '-', -1) AS UNSIGNED) DESC")
            ->value('employee_number');

        if (! $latest) {
            return "{$prefix}-0001";
        }

        $seq = (int) substr($latest, strlen($prefix) + 1);

        return sprintf('%s-%04d', $prefix, $seq + 1);
    }

    /** Pluck all active employees for select dropdowns. */
    public function allActive(): Collection
    {
        return Employee::query()
            ->with('user')
            ->whereNotIn('employment_status', ['resigned', 'terminated'])
            ->whereHas('user', fn (Builder $q) => $q->where('status', 'active'))
            ->orderBy('created_at')
            ->get();
    }
}

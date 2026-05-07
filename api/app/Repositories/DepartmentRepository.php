<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Department;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class DepartmentRepository
{
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        $perPage = min((int) ($filters['per_page'] ?? 15), 100);

        return Department::query()
            ->with(['parent', 'head'])
            ->withCount('employees')
            ->when(isset($filters['search']) && $filters['search'] !== '', function (Builder $q) use ($filters) {
                $term = '%'.addcslashes($filters['search'], '%_').'%';
                $q->where('name', 'like', $term)->orWhere('code', 'like', $term);
            })
            ->when(isset($filters['parent_id']), fn (Builder $q) =>
                $q->where('parent_id', $filters['parent_id']),
            )
            ->when(isset($filters['is_active']), fn (Builder $q) =>
                $q->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN)),
            )
            ->orderBy('name')
            ->paginate($perPage);
    }

    public function allActive(): Collection
    {
        return Department::where('is_active', true)->orderBy('name')->get();
    }

    public function findById(string $id): ?Department
    {
        return Department::with(['parent', 'head', 'positions', 'children'])->find($id);
    }

    public function create(array $data): Department
    {
        return Department::create($data);
    }

    public function update(Department $department, array $data): Department
    {
        $department->fill($data)->save();

        return $department->fresh(['parent', 'head']);
    }

    public function softDelete(Department $department): void
    {
        $department->delete();
    }
}

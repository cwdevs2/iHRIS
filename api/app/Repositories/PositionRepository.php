<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Position;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class PositionRepository
{
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        $perPage = min((int) ($filters['per_page'] ?? 15), 100);

        return Position::query()
            ->with('department')
            ->withCount('employees')
            ->when(isset($filters['search']) && $filters['search'] !== '', function (Builder $q) use ($filters) {
                $term = '%'.addcslashes($filters['search'], '%_').'%';
                $q->where('title', 'like', $term)->orWhere('code', 'like', $term);
            })
            ->when(isset($filters['department_id']), fn (Builder $q) =>
                $q->where('department_id', $filters['department_id']),
            )
            ->when(isset($filters['is_active']), fn (Builder $q) =>
                $q->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN)),
            )
            ->orderBy('rank_level')
            ->orderBy('title')
            ->paginate($perPage);
    }

    public function allActive(?string $departmentId = null): Collection
    {
        return Position::query()
            ->withCount('employees')
            ->where('is_active', true)
            ->when($departmentId, fn (Builder $q) => $q->where('department_id', $departmentId))
            ->orderBy('rank_level')
            ->orderBy('title')
            ->get();
    }

    public function findById(string $id): ?Position
    {
        return Position::with('department')->find($id);
    }

    public function create(array $data): Position
    {
        return Position::create($data);
    }

    public function update(Position $position, array $data): Position
    {
        $position->fill($data)->save();

        return $position->fresh('department');
    }

    public function softDelete(Position $position): void
    {
        $position->delete();
    }
}

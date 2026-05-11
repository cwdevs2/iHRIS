<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\UserGroup;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class UserGroupRepository
{
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        $perPage = min((int) ($filters['per_page'] ?? 15), 100);

        return UserGroup::query()
            ->with(['departments', 'creator', 'director'])
            ->withCount('members')
            ->when(
                isset($filters['search']) && $filters['search'] !== '',
                fn (Builder $q) => $q->where('name', 'like', '%'.addcslashes($filters['search'], '%_').'%'),
            )
            ->when(
                isset($filters['type']) && $filters['type'] !== '',
                fn (Builder $q) => $q->where('type', $filters['type']),
            )
            ->when(
                isset($filters['is_active']),
                fn (Builder $q) => $q->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN)),
            )
            ->when(
                isset($filters['department_id']) && $filters['department_id'] !== '',
                fn (Builder $q) => $q->whereHas(
                    'departments',
                    fn (Builder $dq) => $dq->where('departments.id', $filters['department_id']),
                ),
            )
            ->orderBy('name')
            ->paginate($perPage);
    }

    public function all(array $filters = []): Collection
    {
        return UserGroup::query()
            ->with(['departments', 'creator', 'director'])
            ->withCount('members')
            ->when(
                isset($filters['department_id']) && $filters['department_id'] !== '',
                fn (Builder $q) => $q->whereHas(
                    'departments',
                    fn (Builder $dq) => $dq->where('departments.id', $filters['department_id']),
                ),
            )
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }

    public function findById(string $id): ?UserGroup
    {
        return UserGroup::with(['departments', 'members.employee', 'creator', 'director.employee'])
            ->withCount('members')
            ->find($id);
    }

    public function create(array $data): UserGroup
    {
        return UserGroup::create($data);
    }

    public function update(UserGroup $group, array $data): UserGroup
    {
        $group->fill($data)->save();

        return $group->fresh(['departments', 'creator']);
    }

    public function syncDepartments(UserGroup $group, array $departmentIds): void
    {
        $group->departments()->sync($departmentIds);
    }

    public function addMember(UserGroup $group, string $userId, string $addedBy): void
    {
        // Sync-safe: ignore if already a member
        $group->members()->syncWithoutDetaching([
            $userId => ['added_by' => $addedBy],
        ]);
    }

    public function removeMember(UserGroup $group, string $userId): void
    {
        $group->members()->detach($userId);
    }

    public function softDelete(UserGroup $group): void
    {
        $group->delete();
    }

    public function setDirector(UserGroup $group, string $userId): UserGroup
    {
        $group->director_id = $userId;
        $group->save();

        return $group->fresh(['director.employee']);
    }

    public function clearDirector(UserGroup $group): UserGroup
    {
        $group->director_id = null;
        $group->save();

        return $group->fresh();
    }
}

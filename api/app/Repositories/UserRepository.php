<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;

class UserRepository
{
    private const ALLOWED_SORTS = [
        'first_name', 'last_name', 'email', 'status', 'created_at', 'last_login_at',
    ];

    public function paginate(array $filters = []): LengthAwarePaginator
    {
        $query = User::query()->with('roles');

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', $search)
                  ->orWhere('last_name', 'like', $search)
                  ->orWhere('email', 'like', $search)
                  ->orWhere('phone', 'like', $search);
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['role'])) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $filters['role']));
        }

        $sort      = in_array($filters['sort'] ?? '', self::ALLOWED_SORTS)
            ? $filters['sort']
            : 'created_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $direction);

        $perPage = min((int) ($filters['per_page'] ?? 15), 100);

        return $query->paginate($perPage);
    }

    public function findById(string $id): ?User
    {
        return User::with(['roles', 'employee'])->find($id);
    }

    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    public function create(array $data): User
    {
        return User::create($data);
    }

    public function update(User $user, array $data): User
    {
        $user->update($data);

        return $user->refresh();
    }

    public function syncRoles(User $user, array $roleIds, string $assignedBy): void
    {
        $pivot = array_fill_keys($roleIds, ['assigned_by' => $assignedBy]);
        $user->roles()->sync($pivot);
    }

    public function softDelete(User $user): void
    {
        $user->delete();
    }

    public function allActive(): Collection
    {
        return User::where('status', 'active')
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'email', 'avatar_path']);
    }
}

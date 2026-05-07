<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use App\Repositories\UserRepository;
use App\Services\Audit\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function __construct(
        private UserRepository $repo,
        private AuditLogger $audit,
    ) {}

    public function list(array $filters = []): LengthAwarePaginator
    {
        return $this->repo->paginate($filters);
    }

    public function find(string $id): User
    {
        $user = $this->repo->findById($id);

        abort_if($user === null, 404, 'User not found.');

        return $user;
    }

    public function create(array $data, User $actor): User
    {
        // Check email uniqueness
        if ($this->repo->findByEmail($data['email'])) {
            throw ValidationException::withMessages([
                'email' => ['This email address is already in use.'],
            ]);
        }

        $user = $this->repo->create([
            'first_name'  => $data['first_name'],
            'last_name'   => $data['last_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'email'       => $data['email'],
            'phone'       => $data['phone'] ?? null,
            'password'    => Hash::make($data['password']),
            'status'      => $data['status'] ?? 'active',
        ]);

        if (!empty($data['role_ids'])) {
            $this->repo->syncRoles($user, $data['role_ids'], $actor->id);
        }

        $this->audit->log('user.create', $user, null, $user->toArray(), null, $actor);

        return $user->load('roles');
    }

    public function update(string $id, array $data, User $actor): User
    {
        $user = $this->find($id);
        $before = $user->toArray();

        // Email uniqueness check (exclude self)
        if (isset($data['email']) && $data['email'] !== $user->email) {
            if ($this->repo->findByEmail($data['email'])) {
                throw ValidationException::withMessages([
                    'email' => ['This email address is already in use.'],
                ]);
            }
        }

        $updateData = array_filter([
            'first_name'  => $data['first_name'] ?? null,
            'last_name'   => $data['last_name'] ?? null,
            'middle_name' => $data['middle_name'] ?? null,
            'email'       => $data['email'] ?? null,
            'phone'       => $data['phone'] ?? null,
            'status'      => $data['status'] ?? null,
        ], fn ($v) => $v !== null);

        if (!empty($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
        }

        $user = $this->repo->update($user, $updateData);

        if (array_key_exists('role_ids', $data)) {
            $this->repo->syncRoles($user, $data['role_ids'] ?? [], $actor->id);
        }

        $this->audit->log('user.update', $user, $before, $user->fresh()->toArray(), null, $actor);

        return $user->load('roles');
    }

    public function delete(string $id, User $actor): void
    {
        $user = $this->find($id);

        abort_if($user->id === $actor->id, 422, 'You cannot deactivate your own account.');

        $this->audit->log('user.delete', $user, $user->toArray(), null, null, $actor);
        $this->repo->softDelete($user);
    }

    public function allActive(): Collection
    {
        return $this->repo->allActive();
    }
}

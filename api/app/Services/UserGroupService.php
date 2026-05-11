<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Models\UserGroup;
use App\Repositories\UserGroupRepository;
use App\Services\Audit\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class UserGroupService
{
    public function __construct(
        private UserGroupRepository $repo,
        private AuditLogger $audit,
    ) {}

    public function list(array $filters = []): LengthAwarePaginator
    {
        return $this->repo->paginate($filters);
    }

    public function listAll(array $filters = []): Collection
    {
        return $this->repo->all($filters);
    }

    public function find(string $id): UserGroup
    {
        $group = $this->repo->findById($id);

        if (! $group) {
            abort(404, 'User group not found.');
        }

        return $group;
    }

    public function create(array $data, User $actor): UserGroup
    {
        $departmentIds = $data['department_ids'] ?? [];
        unset($data['department_ids']);

        $data['created_by'] = $actor->id;
        $data['slug'] = Str::slug($data['name']);

        $group = $this->repo->create($data);
        $this->repo->syncDepartments($group, $departmentIds);
        $group->load(['departments', 'creator']);
        $group->loadCount('members');

        $this->audit->log('user_group.created', target: $group, after: $group->toArray(), actor: $actor);

        return $group;
    }

    public function update(string $id, array $data, User $actor): UserGroup
    {
        $group = $this->find($id);
        $before = $group->toArray();

        $departmentIds = $data['department_ids'] ?? null;
        unset($data['department_ids']);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $updated = $this->repo->update($group, $data);

        if ($departmentIds !== null) {
            $this->repo->syncDepartments($updated, $departmentIds);
            $updated->load('departments');
        }

        $this->audit->log('user_group.updated', target: $updated, before: $before, after: $updated->toArray(), actor: $actor);

        return $updated;
    }

    public function addMember(string $groupId, string $userId, User $actor): UserGroup
    {
        $group = $this->find($groupId);

        // Allow if actor is the group's director (even without global permission)
        abort_if(
            $group->director_id !== $actor->id && ! $actor->can('hr.user_groups.manage_members'),
            403,
            'You do not have permission to manage members of this group.',
        );

        $this->repo->addMember($group, $userId, $actor->id);

        $this->audit->log('user_group.member_added', target: $group, metadata: ['user_id' => $userId], actor: $actor);

        return $this->repo->findById($groupId);
    }

    public function removeMember(string $groupId, string $userId, User $actor): UserGroup
    {
        $group = $this->find($groupId);

        abort_if(
            $group->director_id !== $actor->id && ! $actor->can('hr.user_groups.manage_members'),
            403,
            'You do not have permission to manage members of this group.',
        );

        $this->repo->removeMember($group, $userId);

        $this->audit->log('user_group.member_removed', target: $group, metadata: ['user_id' => $userId], actor: $actor);

        return $this->repo->findById($groupId);
    }

    public function assignDirector(string $groupId, string $userId, User $actor): UserGroup
    {
        $group = $this->find($groupId);
        $before = ['director_id' => $group->director_id];

        // Director must be a user that exists (validation in controller)
        // Auto-add director as a member if not already
        $this->repo->addMember($group, $userId, $actor->id);

        $updated = $this->repo->setDirector($group, $userId);
        $updated->load(['departments', 'members.employee', 'creator', 'director.employee']);
        $updated->loadCount('members');

        $this->audit->log(
            'user_group.director_assigned',
            target: $updated,
            before: $before,
            after: ['director_id' => $userId],
            actor: $actor,
        );

        return $updated;
    }

    public function removeDirector(string $groupId, User $actor): UserGroup
    {
        $group = $this->find($groupId);
        $before = ['director_id' => $group->director_id];

        $updated = $this->repo->clearDirector($group);
        $updated->load(['departments', 'members.employee', 'creator']);
        $updated->loadCount('members');

        $this->audit->log(
            'user_group.director_removed',
            target: $updated,
            before: $before,
            after: ['director_id' => null],
            actor: $actor,
        );

        return $updated;
    }

    public function delete(string $id, User $actor): void
    {
        $group = $this->find($id);

        $this->audit->log('user_group.deleted', target: $group, before: $group->toArray(), actor: $actor);
        $this->repo->softDelete($group);
    }
}

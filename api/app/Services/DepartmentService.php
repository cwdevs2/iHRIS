<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Department;
use App\Models\User;
use App\Repositories\DepartmentRepository;
use App\Services\Audit\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class DepartmentService
{
    public function __construct(
        private DepartmentRepository $repo,
        private AuditLogger $audit,
    ) {}

    public function list(array $filters = []): LengthAwarePaginator
    {
        return $this->repo->paginate($filters);
    }

    public function allActive(): Collection
    {
        return $this->repo->allActive();
    }

    public function find(string $id): Department
    {
        $dept = $this->repo->findById($id);

        if (! $dept) {
            abort(404, 'Department not found.');
        }

        return $dept;
    }

    public function create(array $data, User $actor): Department
    {
        $dept = $this->repo->create($data);

        $this->audit->log('department.created', target: $dept, after: $dept->toArray(), actor: $actor);

        return $dept->load(['parent', 'head']);
    }

    public function update(string $id, array $data, User $actor): Department
    {
        $dept = $this->find($id);
        $before = $dept->toArray();
        $updated = $this->repo->update($dept, $data);

        $this->audit->log('department.updated', target: $updated, before: $before, after: $updated->toArray(), actor: $actor);

        return $updated;
    }

    public function delete(string $id, User $actor): void
    {
        $dept = $this->find($id);

        if ($dept->employees()->count() > 0) {
            abort(422, 'Cannot archive a department that has active employees.');
        }

        $this->audit->log('department.deleted', target: $dept, before: $dept->toArray(), actor: $actor);
        $this->repo->softDelete($dept);
    }
}

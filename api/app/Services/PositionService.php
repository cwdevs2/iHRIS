<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Position;
use App\Models\User;
use App\Repositories\PositionRepository;
use App\Services\Audit\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class PositionService
{
    public function __construct(
        private PositionRepository $repo,
        private AuditLogger $audit,
    ) {}

    public function list(array $filters = []): LengthAwarePaginator
    {
        return $this->repo->paginate($filters);
    }

    public function allActive(?string $departmentId = null): Collection
    {
        return $this->repo->allActive($departmentId);
    }

    public function find(string $id): Position
    {
        $pos = $this->repo->findById($id);

        if (! $pos) {
            abort(404, 'Position not found.');
        }

        return $pos;
    }

    public function create(array $data, User $actor): Position
    {
        if (empty($data['code'])) {
            $data['code'] = $this->generateUniqueCode($data['title'] ?? 'pos');
        }

        $pos = $this->repo->create($data);

        $this->audit->log('position.created', target: $pos, after: $pos->toArray(), actor: $actor);

        return $pos->load('department');
    }

    public function update(string $id, array $data, User $actor): Position
    {
        $pos = $this->find($id);
        $before = $pos->toArray();
        $updated = $this->repo->update($pos, $data);

        $this->audit->log('position.updated', target: $updated, before: $before, after: $updated->toArray(), actor: $actor);

        return $updated;
    }

    public function delete(string $id, User $actor): void
    {
        $pos = $this->find($id);

        if ($pos->employees()->count() > 0) {
            abort(422, 'Cannot archive a position that has active employees.');
        }

        $this->audit->log('position.deleted', target: $pos, before: $pos->toArray(), actor: $actor);
        $this->repo->softDelete($pos);
    }

    private function generateUniqueCode(string $title): string
    {
        $base = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $title), 0, 8));
        if ($base === '') {
            $base = 'POS';
        }
        $code = $base;
        $i = 1;
        while (Position::withTrashed()->where('code', $code)->exists()) {
            $code = $base . '-' . str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $i++;
        }

        return $code;
    }
}

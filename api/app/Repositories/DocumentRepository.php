<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Employee;
use App\Models\EmployeeDocument;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class DocumentRepository
{
    public function listForEmployee(string $employeeId, array $filters = []): LengthAwarePaginator
    {
        $perPage = min((int) ($filters['per_page'] ?? 15), 100);

        return EmployeeDocument::query()
            ->with(['uploader:id,first_name,last_name'])
            ->where('employee_id', $employeeId)
            ->when(isset($filters['category']) && $filters['category'] !== '', fn (Builder $q) =>
                $q->where('category', $filters['category']),
            )
            ->when(isset($filters['search']) && $filters['search'] !== '', function (Builder $q) use ($filters) {
                $term = '%'.addcslashes($filters['search'], '%_').'%';
                $q->where('title', 'like', $term)->orWhere('file_name', 'like', $term);
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function allExpiringSoon(int $days = 30): Collection
    {
        return EmployeeDocument::query()
            ->with(['employee.user:id,first_name,last_name'])
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays($days))
            ->orderBy('expires_at')
            ->get();
    }

    public function findById(string $id): ?EmployeeDocument
    {
        return EmployeeDocument::with(['employee', 'uploader:id,first_name,last_name'])->find($id);
    }

    public function create(array $data): EmployeeDocument
    {
        return EmployeeDocument::create($data);
    }

    public function softDelete(EmployeeDocument $document): void
    {
        $document->delete();
    }
}

<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\User;
use App\Repositories\DocumentRepository;
use App\Services\Audit\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentService
{
    public function __construct(
        private DocumentRepository $repo,
        private AuditLogger $audit,
    ) {}

    public function list(string $employeeId, array $filters = []): LengthAwarePaginator
    {
        return $this->repo->listForEmployee($employeeId, $filters);
    }

    public function find(string $id): EmployeeDocument
    {
        $doc = $this->repo->findById($id);

        if (! $doc) {
            abort(404, 'Document not found.');
        }

        return $doc;
    }

    public function upload(Employee $employee, UploadedFile $file, array $data, User $actor): EmployeeDocument
    {
        // Store file under a private disk path
        $path = $file->storeAs(
            'documents/' . $employee->id,
            Str::uuid() . '_' . Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME))
                . '.' . $file->getClientOriginalExtension(),
            'private',
        );

        $doc = $this->repo->create([
            'employee_id'  => $employee->id,
            'uploaded_by'  => $actor->id,
            'category'     => $data['category'],
            'title'        => $data['title'],
            'description'  => $data['description'] ?? null,
            'file_path'    => $path,
            'file_name'    => $file->getClientOriginalName(),
            'mime_type'    => $file->getMimeType() ?? 'application/octet-stream',
            'file_size'    => $file->getSize(),
            'expires_at'   => $data['expires_at'] ?? null,
            'is_private'   => (bool) ($data['is_private'] ?? false),
        ]);

        $this->audit->log('document.uploaded', target: $doc, after: $doc->toArray(), actor: $actor);

        return $doc->load('uploader:id,first_name,last_name');
    }

    public function download(EmployeeDocument $document): array
    {
        if (! Storage::disk('private')->exists($document->file_path)) {
            abort(404, 'File not found in storage.');
        }

        return [
            'url'       => Storage::disk('private')->temporaryUrl(
                $document->file_path,
                now()->addMinutes(5),
            ),
            'file_name' => $document->file_name,
            'mime_type' => $document->mime_type,
        ];
    }

    public function delete(string $id, User $actor): void
    {
        $doc = $this->find($id);

        Storage::disk('private')->delete($doc->file_path);

        $this->audit->log('document.deleted', target: $doc, before: $doc->toArray(), actor: $actor);

        $this->repo->softDelete($doc);
    }
}

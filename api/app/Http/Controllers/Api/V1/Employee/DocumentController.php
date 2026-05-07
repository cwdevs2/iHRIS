<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Employee;

use App\Http\Controllers\Controller;
use App\Services\DocumentService;
use App\Services\EmployeeService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function __construct(
        private DocumentService $service,
        private EmployeeService $employees,
    ) {}

    /** GET /employees/{employee}/documents */
    public function index(Request $request, string $employeeId): JsonResponse
    {
        $employee = $this->employees->find($employeeId);
        $filters  = $request->only(['search', 'category', 'per_page', 'page']);

        $paginated = $this->service->list($employee->id, $filters);

        return ApiResponse::success([
            'documents' => $paginated->items(),
            'pagination' => [
                'total'        => $paginated->total(),
                'per_page'     => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
            ],
        ]);
    }

    /** POST /employees/{employee}/documents */
    public function store(Request $request, string $employeeId): JsonResponse
    {
        $employee = $this->employees->find($employeeId);

        $validated = $request->validate([
            'file'        => ['required', 'file', 'max:20480', 'mimes:pdf,doc,docx,jpg,jpeg,png,gif,xls,xlsx,csv,txt,zip'],
            'category'    => ['required', 'string', 'max:100'],
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'expires_at'  => ['nullable', 'date', 'after:today'],
            'is_private'  => ['nullable', 'boolean'],
        ]);

        $doc = $this->service->upload(
            $employee,
            $request->file('file'),
            $validated,
            $request->user(),
        );

        return ApiResponse::success(['document' => $doc], 201);
    }

    /** GET /documents/{document} */
    public function show(string $id): JsonResponse
    {
        $doc = $this->service->find($id);

        return ApiResponse::success(['document' => $doc]);
    }

    /** GET /documents/{document}/download */
    public function download(string $id): JsonResponse
    {
        $doc  = $this->service->find($id);
        $info = $this->service->download($doc);

        return ApiResponse::success($info);
    }

    /** DELETE /documents/{document} */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->service->delete($id, $request->user());

        return ApiResponse::success(['message' => 'Document deleted.']);
    }
}

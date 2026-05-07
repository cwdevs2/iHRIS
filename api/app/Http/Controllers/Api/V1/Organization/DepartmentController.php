<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Department\StoreDepartmentRequest;
use App\Http\Requests\Department\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Services\DepartmentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function __construct(private DepartmentService $service) {}

    public function index(Request $request): JsonResponse
    {
        // When ?all=true, return a simple list for dropdowns (no pagination).
        if ($request->boolean('all')) {
            return ApiResponse::success([
                'departments' => DepartmentResource::collection($this->service->allActive()),
            ]);
        }

        $paginator = $this->service->list($request->only([
            'search', 'parent_id', 'is_active', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'departments' => DepartmentResource::collection($paginator),
            'pagination'  => [
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $dept = $this->service->create($request->validated(), $request->user());

        return ApiResponse::success(['department' => new DepartmentResource($dept)], 201);
    }

    public function show(string $id): JsonResponse
    {
        $dept = $this->service->find($id);

        return ApiResponse::success(['department' => new DepartmentResource($dept)]);
    }

    public function update(UpdateDepartmentRequest $request, string $id): JsonResponse
    {
        $dept = $this->service->update($id, $request->validated(), $request->user());

        return ApiResponse::success(['department' => new DepartmentResource($dept)]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->service->delete($id, $request->user());

        return ApiResponse::success(['message' => 'Department archived.']);
    }
}

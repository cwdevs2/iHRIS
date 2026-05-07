<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\StoreEmployeeRequest;
use App\Http\Requests\Employee\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeResource;
use App\Services\EmployeeService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function __construct(private EmployeeService $service) {}

    /**
     * GET /api/v1/employees
     * Query params: search, department_id, position_id, employment_status,
     *               per_page, page, sort, direction
     */
    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->list($request->only([
            'search',
            'department_id',
            'position_id',
            'employment_status',
            'per_page',
            'page',
            'sort',
            'direction',
        ]));

        return ApiResponse::success([
            'employees'  => EmployeeResource::collection($paginator),
            'pagination' => [
                'total'        => $paginator->total(),
                'per_page'     => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/employees
     */
    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        $employee = $this->service->create(
            $request->validated(),
            $request->user(),
        );

        return ApiResponse::success(
            ['employee' => new EmployeeResource($employee)],
            201,
        );
    }

    /**
     * GET /api/v1/employees/{id}
     */
    public function show(string $id): JsonResponse
    {
        $employee = $this->service->find($id);

        return ApiResponse::success(['employee' => new EmployeeResource($employee)]);
    }

    /**
     * PATCH /api/v1/employees/{id}
     */
    public function update(UpdateEmployeeRequest $request, string $id): JsonResponse
    {
        $employee = $this->service->update($id, $request->validated(), $request->user());

        return ApiResponse::success(['employee' => new EmployeeResource($employee)]);
    }

    /**
     * DELETE /api/v1/employees/{id}
     * Soft delete only — record is never physically removed.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->service->delete($id, $request->user());

        return ApiResponse::success(['message' => 'Employee record archived.']);
    }
}

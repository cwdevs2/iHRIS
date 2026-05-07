<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payroll\StorePayrollPeriodRequest;
use App\Http\Requests\Payroll\UpdatePayrollPeriodRequest;
use App\Http\Resources\PayrollPeriodResource;
use App\Services\PayrollPeriodService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollPeriodController extends Controller
{
    public function __construct(private PayrollPeriodService $service) {}

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->paginate($request->only([
            'status', 'frequency', 'date_from', 'date_to', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'periods' => PayrollPeriodResource::collection($paginator),
            'pagination' => [
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        return ApiResponse::success([
            'period' => new PayrollPeriodResource($this->service->find($id)),
        ]);
    }

    public function store(StorePayrollPeriodRequest $request): JsonResponse
    {
        $period = $this->service->create($request->validated(), $request->user());

        return ApiResponse::success(
            ['period' => new PayrollPeriodResource($period)],
            201,
        );
    }

    public function update(UpdatePayrollPeriodRequest $request, string $id): JsonResponse
    {
        $period = $this->service->update($id, $request->validated(), $request->user());

        return ApiResponse::success(['period' => new PayrollPeriodResource($period)]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->service->delete($id, $request->user());

        return ApiResponse::success(['message' => 'Payroll period deleted.']);
    }
}

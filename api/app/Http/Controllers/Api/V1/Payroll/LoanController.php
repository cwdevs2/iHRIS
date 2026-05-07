<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payroll\StoreLoanRequest;
use App\Http\Requests\Payroll\UpdateLoanRequest;
use App\Http\Resources\LoanResource;
use App\Services\Payroll\LoanService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoanController extends Controller
{
    public function __construct(private LoanService $service) {}

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->paginate($request->only([
            'employee_id', 'status', 'type', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'loans' => LoanResource::collection($paginator),
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
            'loan' => new LoanResource($this->service->find($id)),
        ]);
    }

    public function store(StoreLoanRequest $request): JsonResponse
    {
        $loan = $this->service->create($request->validated(), $request->user());

        return ApiResponse::success(['loan' => new LoanResource($loan)], 201);
    }

    public function update(UpdateLoanRequest $request, string $id): JsonResponse
    {
        $loan = $this->service->update(
            $this->service->find($id),
            $request->validated(),
            $request->user(),
        );

        return ApiResponse::success(['loan' => new LoanResource($loan)]);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payroll\ComputeFinalPayRequest;
use App\Models\Employee;
use App\Services\Payroll\FinalPayService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class FinalPayController extends Controller
{
    public function __construct(private FinalPayService $service) {}

    /**
     * POST /payroll/final-pay/compute
     * Computes final pay for an employee but does NOT persist anything.
     * The HR admin reviews the breakdown and then optionally creates a payroll run.
     */
    public function compute(ComputeFinalPayRequest $request): JsonResponse
    {
        $data = $request->validated();
        $employee = Employee::with(['user', 'department'])->findOrFail($data['employee_id']);

        $result = $this->service->record($employee, $data, $request->user());

        return ApiResponse::success([
            'employee' => [
                'id' => $employee->id,
                'employee_number' => $employee->employee_number,
                'name' => $employee->user?->full_name,
                'date_hired' => $employee->date_hired?->toDateString(),
                'employment_status' => $employee->employment_status,
            ],
            'context' => $data,
            'computation' => $result,
        ]);
    }
}

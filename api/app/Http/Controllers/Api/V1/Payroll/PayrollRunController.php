<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payroll\GeneratePayslipsRequest;
use App\Http\Requests\Payroll\StorePayrollRunRequest;
use App\Http\Resources\PayrollRunResource;
use App\Services\Payroll\PayrollInputs;
use App\Services\Payroll\PayrollRunService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollRunController extends Controller
{
    public function __construct(private PayrollRunService $service) {}

    public function index(Request $request): JsonResponse
    {
        $paginator = $this->service->paginate($request->only([
            'status', 'payroll_period_id', 'date_from', 'date_to', 'per_page', 'page',
        ]));

        return ApiResponse::success([
            'runs' => PayrollRunResource::collection($paginator),
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
            'run' => new PayrollRunResource($this->service->find($id)),
        ]);
    }

    public function store(StorePayrollRunRequest $request): JsonResponse
    {
        $run = $this->service->createDraft($request->validated(), $request->user());

        return ApiResponse::success(['run' => new PayrollRunResource($run)], 201);
    }

    /** POST /payroll/runs/{id}/generate */
    public function generate(GeneratePayslipsRequest $request, string $id): JsonResponse
    {
        $run = $this->service->find($id);
        $payload = $request->validated();
        $effectiveYear = $payload['effective_year'] ?? null;

        // Translate the wire-format inputs into PayrollInputs DTOs.
        $inputs = [];
        foreach ($payload['inputs'] ?? [] as $employeeId => $row) {
            $inputs[$employeeId] = new PayrollInputs(
                regularHours: (float) ($row['regular_hours'] ?? 0),
                overtimeHours: (float) ($row['overtime_hours'] ?? 0),
                restDayHours: (float) ($row['rest_day_hours'] ?? 0),
                regularHolidayHours: (float) ($row['regular_holiday_hours'] ?? 0),
                specialHolidayHours: (float) ($row['special_holiday_hours'] ?? 0),
                nightDiffHours: (float) ($row['night_diff_hours'] ?? 0),
                absentDays: (float) ($row['absent_days'] ?? 0),
                lateMinutes: (float) ($row['late_minutes'] ?? 0),
                undertimeMinutes: (float) ($row['undertime_minutes'] ?? 0),
                allowances: $row['allowances'] ?? [],
                bonuses: $row['bonuses'] ?? [],
                otherDeductions: $row['other_deductions'] ?? [],
            );
        }

        $run = $this->service->generatePayslips($run, $inputs, $request->user(), $effectiveYear);

        return ApiResponse::success(['run' => new PayrollRunResource($run)]);
    }

    /** PATCH /payroll/runs/{id}/finalize */
    public function finalize(Request $request, string $id): JsonResponse
    {
        $run = $this->service->finalize($this->service->find($id), $request->user());

        return ApiResponse::success(['run' => new PayrollRunResource($run)]);
    }

    /** PATCH /payroll/runs/{id}/mark-paid */
    public function markPaid(Request $request, string $id): JsonResponse
    {
        $run = $this->service->markPaid($this->service->find($id), $request->user());

        return ApiResponse::success(['run' => new PayrollRunResource($run)]);
    }

    /** PATCH /payroll/runs/{id}/cancel */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $run = $this->service->cancel($this->service->find($id), $request->user());

        return ApiResponse::success(['run' => new PayrollRunResource($run)]);
    }
}

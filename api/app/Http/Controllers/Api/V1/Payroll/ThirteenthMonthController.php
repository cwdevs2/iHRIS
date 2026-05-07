<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Payroll;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Services\Payroll\ThirteenthMonthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ThirteenthMonthController extends Controller
{
    public function __construct(private ThirteenthMonthService $service) {}

    /** GET /payroll/thirteenth-month?year=2026 — full company computation */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'year' => ['required', 'integer', 'min:2020', 'max:2099'],
        ]);

        $year = (int) $request->query('year');
        $rows = $this->service->computeForCompany($year);

        return ApiResponse::success([
            'year' => $year,
            'rows' => $rows->map(fn ($row) => [
                'employee_id' => $row['employee']->id,
                'employee_number' => $row['employee']->employee_number,
                'name' => $row['employee']->user?->full_name,
                'department' => $row['employee']->department?->name,
                ...$row['computation'],
            ])->values(),
            'totals' => [
                'thirteenth_month' => $rows->sum(fn ($r) => $r['computation']['thirteenth_month']),
                'taxable_excess' => $rows->sum(fn ($r) => $r['computation']['taxable_excess']),
            ],
        ]);
    }

    /** GET /payroll/thirteenth-month/{employeeId}?year=2026 — single employee */
    public function show(Request $request, string $employeeId): JsonResponse
    {
        $request->validate([
            'year' => ['required', 'integer', 'min:2020', 'max:2099'],
        ]);

        $employee = Employee::with('user')->findOrFail($employeeId);
        $year = (int) $request->query('year');
        $computation = $this->service->computeForEmployee($employee, $year);

        return ApiResponse::success([
            'employee' => [
                'id' => $employee->id,
                'employee_number' => $employee->employee_number,
                'name' => $employee->user?->full_name,
            ],
            'year' => $year,
            'computation' => $computation,
        ]);
    }
}

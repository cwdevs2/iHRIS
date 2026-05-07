<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Payroll;

use App\Http\Controllers\Controller;
use App\Services\Payroll\ComplianceReportService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplianceReportController extends Controller
{
    public function __construct(private ComplianceReportService $reports) {}

    /** GET /payroll/reports/sss?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD */
    public function sss(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        return ApiResponse::success(
            $this->reports->sssReport($request->query('date_from'), $request->query('date_to')),
        );
    }

    /** GET /payroll/reports/philhealth */
    public function philhealth(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        return ApiResponse::success(
            $this->reports->philhealthReport($request->query('date_from'), $request->query('date_to')),
        );
    }

    /** GET /payroll/reports/pagibig */
    public function pagibig(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        return ApiResponse::success(
            $this->reports->pagibigReport($request->query('date_from'), $request->query('date_to')),
        );
    }

    /** GET /payroll/reports/bir-alpha-list?year=2026 */
    public function birAlphaList(Request $request): JsonResponse
    {
        $request->validate([
            'year' => ['required', 'integer', 'min:2020', 'max:2099'],
        ]);

        return ApiResponse::success(
            $this->reports->birAlphaList((int) $request->query('year')),
        );
    }
}

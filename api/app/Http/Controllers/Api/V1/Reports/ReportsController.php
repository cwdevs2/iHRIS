<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Services\Reports\ReportsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 7: Unified Reports & Analytics endpoints.
 *
 * Permission gating happens at the route layer; this controller is intentionally
 * thin and delegates all aggregation to ReportsService.
 */
class ReportsController extends Controller
{
    public function __construct(private readonly ReportsService $reports) {}

    /** GET /reports/summary — exec dashboard tiles */
    public function summary(): JsonResponse
    {
        return ApiResponse::success($this->reports->executiveSummary());
    }

    /** GET /reports/employees */
    public function employees(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        return ApiResponse::success($this->reports->employeeReport(
            $request->query('date_from'),
            $request->query('date_to'),
        ));
    }

    /** GET /reports/attendance */
    public function attendance(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        return ApiResponse::success($this->reports->attendanceReport(
            $data['date_from'],
            $data['date_to'],
        ));
    }

    /** GET /reports/leaves */
    public function leaves(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        return ApiResponse::success($this->reports->leaveReport(
            $data['date_from'],
            $data['date_to'],
        ));
    }

    /** GET /reports/payroll-register */
    public function payrollRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        return ApiResponse::success($this->reports->payrollRegister(
            $data['date_from'],
            $data['date_to'],
        ));
    }

    /** GET /reports/recruitment */
    public function recruitment(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        return ApiResponse::success($this->reports->recruitmentReport(
            $request->query('date_from'),
            $request->query('date_to'),
        ));
    }

    /** GET /reports/performance */
    public function performance(): JsonResponse
    {
        return ApiResponse::success($this->reports->performanceReport());
    }

    /**
     * GET /reports/{type}/export?format=csv
     *
     * Streams the chosen report as CSV. PDF export is generated client-side via
     * the browser's "Save as PDF" using the report's print stylesheet.
     */
    public function export(Request $request, string $type): mixed
    {
        $data = $request->validate([
            'format' => ['nullable', 'string', 'in:csv'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $from = $request->query('date_from');
        $to = $request->query('date_to');
        $filename = "report-{$type}-" . now()->format('Ymd-His') . '.csv';

        $rows = match ($type) {
            'attendance' => $this->reports->attendanceReport($from ?? now()->subMonth()->toDateString(), $to ?? now()->toDateString())['daily'],
            'leaves' => $this->reports->leaveReport($from ?? now()->subMonth()->toDateString(), $to ?? now()->toDateString())['by_type'],
            'payroll-register' => $this->reports->payrollRegister($from ?? now()->subMonth()->toDateString(), $to ?? now()->toDateString())['rows'],
            'recruitment' => $this->reports->recruitmentReport($from, $to)['by_stage'],
            'performance' => $this->reports->performanceReport()['top_performers'],
            'employees' => $this->reports->employeeReport($from, $to)['by_department'],
            default => null,
        };

        if ($rows === null) {
            return ApiResponse::fail(['type' => 'Unknown report type.'], 404);
        }

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }

            if (count($rows) === 0) {
                fputcsv($out, ['No data for selected range.']);
                fclose($out);
                return;
            }

            $first = (array) $rows[0];
            fputcsv($out, array_keys($first));

            foreach ($rows as $row) {
                fputcsv($out, array_values((array) $row));
            }
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}

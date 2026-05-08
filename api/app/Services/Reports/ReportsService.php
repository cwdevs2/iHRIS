<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Models\Applicant;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\JobPosting;
use App\Models\JobRequisition;
use App\Models\LeaveRequest;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PerformanceReview;
use Carbon\Carbon;

/**
 * Aggregates analytics across all HR modules for the unified Reports hub.
 *
 * Each method returns a structured array shaped for the frontend; callers are
 * responsible for permission checks and date-range validation.
 */
class ReportsService
{
    /**
     * Top-level KPI tiles shown on the Reports landing page.
     */
    public function executiveSummary(): array
    {
        $today = Carbon::today();
        $monthStart = $today->copy()->startOfMonth();

        $headcount = Employee::query()->whereNull('deleted_at')->count();
        $activeHeadcount = Employee::query()
            ->whereNull('deleted_at')
            ->whereIn('employment_status', ['regular', 'probationary', 'contractual', 'part_time'])
            ->count();

        $newHiresMtd = Employee::query()
            ->whereNull('deleted_at')
            ->where('date_hired', '>=', $monthStart)
            ->count();

        $separationsMtd = Employee::query()
            ->whereNull('deleted_at')
            ->whereNotNull('separation_date')
            ->where('separation_date', '>=', $monthStart)
            ->count();

        $pendingLeaves = LeaveRequest::query()
            ->where('status', 'pending')
            ->count();

        $openRequisitions = JobRequisition::query()
            ->where('status', 'approved')
            ->count();

        $reviewsInProgress = PerformanceReview::query()
            ->whereIn('status', ['pending', 'in_progress'])
            ->count();

        $payrollRunsThisMonth = PayrollRun::query()
            ->where('created_at', '>=', $monthStart)
            ->count();

        return [
            'headcount' => [
                'total' => $headcount,
                'active' => $activeHeadcount,
                'new_hires_mtd' => $newHiresMtd,
                'separations_mtd' => $separationsMtd,
            ],
            'pending_leaves' => $pendingLeaves,
            'open_requisitions' => $openRequisitions,
            'reviews_in_progress' => $reviewsInProgress,
            'payroll_runs_mtd' => $payrollRunsThisMonth,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Headcount breakdown by department + employment status, plus monthly trend.
     */
    public function employeeReport(?string $dateFrom = null, ?string $dateTo = null): array
    {
        $byDepartment = Employee::query()
            ->whereNull('employees.deleted_at')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->selectRaw('COALESCE(departments.name, "Unassigned") as department, COUNT(*) as count')
            ->groupBy('departments.name')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['department' => $row->department, 'count' => (int) $row->count])
            ->values()
            ->all();

        $byStatus = Employee::query()
            ->whereNull('deleted_at')
            ->selectRaw('employment_status, COUNT(*) as count')
            ->groupBy('employment_status')
            ->get()
            ->map(fn ($row) => ['status' => $row->employment_status, 'count' => (int) $row->count])
            ->values()
            ->all();

        $byGender = Employee::query()
            ->whereNull('deleted_at')
            ->whereNotNull('gender')
            ->selectRaw('gender, COUNT(*) as count')
            ->groupBy('gender')
            ->get()
            ->map(fn ($row) => ['gender' => (string) $row->gender, 'count' => (int) $row->count])
            ->values()
            ->all();

        // Monthly hire vs separation trend over the requested range (default: last 12 months).
        $end = $dateTo ? Carbon::parse($dateTo)->endOfMonth() : Carbon::today()->endOfMonth();
        $start = $dateFrom
            ? Carbon::parse($dateFrom)->startOfMonth()
            : $end->copy()->subMonths(11)->startOfMonth();

        $hires = Employee::query()
            ->whereBetween('date_hired', [$start, $end])
            ->selectRaw('DATE_FORMAT(date_hired, "%Y-%m") as month, COUNT(*) as count')
            ->groupBy('month')
            ->pluck('count', 'month');

        $separations = Employee::query()
            ->whereBetween('separation_date', [$start, $end])
            ->selectRaw('DATE_FORMAT(separation_date, "%Y-%m") as month, COUNT(*) as count')
            ->groupBy('month')
            ->pluck('count', 'month');

        $trend = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $key = $cursor->format('Y-m');
            $trend[] = [
                'month' => $key,
                'hires' => (int) ($hires[$key] ?? 0),
                'separations' => (int) ($separations[$key] ?? 0),
            ];
            $cursor->addMonth();
        }

        // Annualised turnover rate: separations / avg headcount over period.
        $totalSeparations = array_sum(array_column($trend, 'separations'));
        $avgHeadcount = max(1, Employee::query()->whereNull('deleted_at')->count());
        $months = max(1, count($trend));
        $turnoverRate = round(($totalSeparations / $avgHeadcount) * (12 / $months) * 100, 2);

        return [
            'by_department' => $byDepartment,
            'by_status' => $byStatus,
            'by_gender' => $byGender,
            'trend' => $trend,
            'turnover_rate_annualized' => $turnoverRate,
            'date_range' => [
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
            ],
        ];
    }

    /**
     * Daily attendance summary across the requested range.
     */
    public function attendanceReport(string $dateFrom, string $dateTo): array
    {
        $from = Carbon::parse($dateFrom)->toDateString();
        $to = Carbon::parse($dateTo)->toDateString();

        $rows = AttendanceLog::query()
            ->whereBetween('work_date', [$from, $to])
            ->selectRaw('work_date,
                COUNT(DISTINCT employee_id) as present,
                SUM(CASE WHEN late_minutes > 0 THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN undertime_minutes > 0 THEN 1 ELSE 0 END) as undertime_count,
                COALESCE(SUM(overtime_hours), 0) as overtime_hours')
            ->groupBy('work_date')
            ->orderBy('work_date')
            ->get()
            ->map(fn ($row) => [
                'date' => Carbon::parse($row->work_date)->toDateString(),
                'present' => (int) $row->present,
                'late' => (int) $row->late_count,
                'undertime' => (int) $row->undertime_count,
                'overtime_hours' => round((float) $row->overtime_hours, 2),
            ])
            ->values()
            ->all();

        $totals = [
            'days_covered' => count($rows),
            'total_late' => array_sum(array_column($rows, 'late')),
            'total_undertime' => array_sum(array_column($rows, 'undertime')),
            'total_overtime_hours' => round(array_sum(array_column($rows, 'overtime_hours')), 2),
        ];

        return [
            'daily' => $rows,
            'totals' => $totals,
            'date_range' => ['from' => $from, 'to' => $to],
        ];
    }

    /**
     * Leave utilization & balance summary.
     */
    public function leaveReport(string $dateFrom, string $dateTo): array
    {
        $from = Carbon::parse($dateFrom)->toDateString();
        $to = Carbon::parse($dateTo)->toDateString();

        $byType = LeaveRequest::query()
            ->whereBetween('leave_requests.start_date', [$from, $to])
            ->where('leave_requests.status', 'approved')
            ->leftJoin('leave_types', 'leave_types.id', '=', 'leave_requests.leave_type_id')
            ->selectRaw('COALESCE(leave_types.name, "Unknown") as leave_type,
                COUNT(*) as request_count,
                COALESCE(SUM(leave_requests.total_days), 0) as total_days')
            ->groupBy('leave_types.name')
            ->orderByDesc('total_days')
            ->get()
            ->map(fn ($row) => [
                'leave_type' => (string) $row->leave_type,
                'requests' => (int) $row->request_count,
                'total_days' => (float) $row->total_days,
            ])
            ->values()
            ->all();

        $byStatus = LeaveRequest::query()
            ->whereBetween('start_date', [$from, $to])
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => ['status' => (string) $row->status, 'count' => (int) $row->count])
            ->values()
            ->all();

        return [
            'by_type' => $byType,
            'by_status' => $byStatus,
            'date_range' => ['from' => $from, 'to' => $to],
        ];
    }

    /**
     * Payroll register: aggregated payslip totals for the date range.
     */
    public function payrollRegister(string $dateFrom, string $dateTo): array
    {
        $from = Carbon::parse($dateFrom)->startOfDay();
        $to = Carbon::parse($dateTo)->endOfDay();

        $rows = Payslip::query()
            ->whereHas('run', function ($q) use ($from, $to): void {
                $q->whereBetween('created_at', [$from, $to]);
            })
            ->with(['employee:id,user_id,employee_number,department_id', 'employee.user:id,first_name,last_name'])
            ->get()
            ->map(fn (Payslip $payslip) => [
                'employee_number' => $payslip->employee?->employee_number,
                'employee_name' => trim(
                    ($payslip->employee?->user?->first_name ?? '')
                    . ' '
                    . ($payslip->employee?->user?->last_name ?? '')
                ),
                'gross_earnings' => (float) $payslip->gross_earnings,
                'total_deductions' => (float) $payslip->total_deductions,
                'net_pay' => (float) $payslip->net_pay,
            ])
            ->values()
            ->all();

        $totals = [
            'count' => count($rows),
            'gross_earnings' => round(array_sum(array_column($rows, 'gross_earnings')), 2),
            'total_deductions' => round(array_sum(array_column($rows, 'total_deductions')), 2),
            'net_pay' => round(array_sum(array_column($rows, 'net_pay')), 2),
        ];

        return [
            'rows' => $rows,
            'totals' => $totals,
            'date_range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        ];
    }

    /**
     * Recruitment funnel + time-to-hire.
     */
    public function recruitmentReport(?string $dateFrom = null, ?string $dateTo = null): array
    {
        $query = Applicant::query();
        if ($dateFrom) {
            $query->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }
        if ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        $byStage = (clone $query)
            ->selectRaw('stage, COUNT(*) as count')
            ->groupBy('stage')
            ->get()
            ->map(fn ($row) => ['stage' => (string) $row->stage, 'count' => (int) $row->count])
            ->values()
            ->all();

        $bySource = (clone $query)
            ->selectRaw('COALESCE(source, "unknown") as source, COUNT(*) as count')
            ->groupBy('source')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['source' => (string) $row->source, 'count' => (int) $row->count])
            ->values()
            ->all();

        // Average time-to-hire: created_at → updated_at on applicants whose stage = hired.
        $hired = (clone $query)->where('stage', 'hired')->get();
        $totalDays = 0;
        foreach ($hired as $applicant) {
            $totalDays += $applicant->created_at->diffInDays($applicant->updated_at);
        }
        $avgTimeToHire = $hired->count() > 0 ? round($totalDays / $hired->count(), 1) : 0;

        $openPostings = JobPosting::query()->where('status', 'published')->count();

        return [
            'by_stage' => $byStage,
            'by_source' => $bySource,
            'open_postings' => $openPostings,
            'hired_count' => $hired->count(),
            'avg_time_to_hire_days' => $avgTimeToHire,
            'date_range' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
        ];
    }

    /**
     * Performance review distribution across active cycles.
     */
    public function performanceReport(): array
    {
        $byStatus = PerformanceReview::query()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => ['status' => (string) $row->status, 'count' => (int) $row->count])
            ->values()
            ->all();

        $scoreDistribution = PerformanceReview::query()
            ->whereNotNull('overall_score')
            ->selectRaw('FLOOR(overall_score) as bucket, COUNT(*) as count')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(fn ($row) => [
                'score_bucket' => (int) $row->bucket,
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();

        $topPerformers = PerformanceReview::query()
            ->whereNotNull('overall_score')
            ->orderByDesc('overall_score')
            ->limit(10)
            ->with(['employee:id,user_id,employee_number', 'employee.user:id,first_name,last_name'])
            ->get()
            ->map(fn (PerformanceReview $review) => [
                'employee_number' => $review->employee?->employee_number,
                'employee_name' => trim(
                    ($review->employee?->user?->first_name ?? '')
                    . ' '
                    . ($review->employee?->user?->last_name ?? '')
                ),
                'overall_score' => (float) $review->overall_score,
            ])
            ->values()
            ->all();

        return [
            'by_status' => $byStatus,
            'score_distribution' => $scoreDistribution,
            'top_performers' => $topPerformers,
        ];
    }
}

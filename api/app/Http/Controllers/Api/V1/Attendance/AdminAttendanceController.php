<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Attendance;

use App\Http\Controllers\Controller;
use App\Models\AttendanceCorrectionRequest;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAttendanceController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * GET /admin/attendance
     * List all attendance logs (paginated, filterable by employee, date, status).
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) ($request->input('per_page', 20)), 100);

        $logs = AttendanceLog::with(['employee.user', 'employee.department', 'employee.position'])
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->input('employee_id')))
            ->when($request->filled('from'),        fn ($q) => $q->whereDate('work_date', '>=', $request->input('from')))
            ->when($request->filled('to'),          fn ($q) => $q->whereDate('work_date', '<=', $request->input('to')))
            ->when($request->filled('status'),      fn ($q) => $q->where('status', $request->input('status')))
            ->orderByDesc('work_date')
            ->orderBy('employee_id')
            ->paginate($perPage);

        return ApiResponse::success([
            'logs' => $logs->items(),
            'pagination' => [
                'total'        => $logs->total(),
                'per_page'     => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
            ],
        ]);
    }

    /**
     * POST /admin/attendance/manual
     * HR Admin manually creates or overrides an attendance log.
     */
    public function manual(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id'   => ['required', 'uuid', 'exists:employees,id'],
            'work_date'     => ['required', 'date'],
            'clock_in_at'   => ['nullable', 'date_format:H:i'],
            'clock_out_at'  => ['nullable', 'date_format:H:i', 'after:clock_in_at'],
            'status'        => ['required', 'in:present,late,undertime,absent,on_leave,holiday'],
            'remarks'       => ['nullable', 'string', 'max:1000'],
        ]);

        $clockIn  = $data['clock_in_at']  ? $data['work_date'] . ' ' . $data['clock_in_at'] . ':00' : null;
        $clockOut = $data['clock_out_at'] ? $data['work_date'] . ' ' . $data['clock_out_at'] . ':00' : null;

        $regularHrs  = 0.0;
        $overtimeHrs = 0.0;
        if ($clockIn && $clockOut) {
            $totalMin    = (new \DateTime($clockIn))->diff(new \DateTime($clockOut));
            $totalHrs    = ($totalMin->h * 60 + $totalMin->i) / 60;
            $regularHrs  = min($totalHrs, 8.0);
            $overtimeHrs = max(0, $totalHrs - 8.0);
        }

        $log = AttendanceLog::updateOrCreate(
            ['employee_id' => $data['employee_id'], 'work_date' => $data['work_date']],
            [
                'clock_in_at'    => $clockIn,
                'clock_out_at'   => $clockOut,
                'regular_hours'  => $regularHrs,
                'overtime_hours' => $overtimeHrs,
                'status'         => $data['status'],
                'remarks'        => $data['remarks'] ?? null,
                'source'         => 'manual',
                'is_corrected'   => true,
            ],
        );

        $this->audit->log(
            'attendance.manual_entry',
            target: $log,
            after: $log->toArray(),
            actor: $request->user(),
        );

        return ApiResponse::success(['log' => $log->load('employee.user')], 201);
    }

    /**
     * GET /admin/attendance/corrections
     * List all correction requests.
     */
    public function corrections(Request $request): JsonResponse
    {
        $perPage = min((int) ($request->input('per_page', 20)), 100);

        $corrections = AttendanceCorrectionRequest::with(['employee.user', 'employee.department'])
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->input('employee_id')))
            ->when($request->filled('status'),      fn ($q) => $q->where('status', $request->input('status')))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success([
            'corrections' => $corrections->items(),
            'pagination' => [
                'total'        => $corrections->total(),
                'per_page'     => $corrections->perPage(),
                'current_page' => $corrections->currentPage(),
                'last_page'    => $corrections->lastPage(),
            ],
        ]);
    }

    /**
     * PATCH /admin/attendance/corrections/{id}/approve
     * Approve a correction and apply the corrected times to the attendance log.
     */
    public function approveCorrection(Request $request, string $id): JsonResponse
    {
        $correction = AttendanceCorrectionRequest::findOrFail($id);

        if ($correction->status !== 'pending') {
            return ApiResponse::error('Correction is already ' . $correction->status . '.', 422);
        }

        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $correction->update([
            'status'        => 'approved',
            'reviewed_by'   => $request->user()->id,
            'reviewer_note' => $data['note'] ?? null,
            'reviewed_at'   => now(),
        ]);

        // Apply to attendance log
        $logData = [];
        if ($correction->requested_clock_in) {
            $logData['clock_in_at'] = $correction->work_date . ' ' . $correction->requested_clock_in;
        }
        if ($correction->requested_clock_out) {
            $logData['clock_out_at'] = $correction->work_date . ' ' . $correction->requested_clock_out;
        }
        if (! empty($logData)) {
            $logData['is_corrected'] = true;
            $logData['source']       = 'manual';

            if (isset($logData['clock_in_at'], $logData['clock_out_at'])) {
                $diff        = (new \DateTime($logData['clock_in_at']))->diff(new \DateTime($logData['clock_out_at']));
                $totalHrs    = ($diff->h * 60 + $diff->i) / 60;
                $logData['regular_hours']  = min($totalHrs, 8.0);
                $logData['overtime_hours'] = max(0, $totalHrs - 8.0);
            }

            AttendanceLog::updateOrCreate(
                ['employee_id' => $correction->employee_id, 'work_date' => $correction->work_date],
                $logData,
            );
        }

        $this->audit->log('attendance.correction_approved', target: $correction, actor: $request->user());

        return ApiResponse::success(['correction' => $correction->fresh()]);
    }

    /**
     * PATCH /admin/attendance/corrections/{id}/reject
     */
    public function rejectCorrection(Request $request, string $id): JsonResponse
    {
        $correction = AttendanceCorrectionRequest::findOrFail($id);

        if ($correction->status !== 'pending') {
            return ApiResponse::error('Correction is already ' . $correction->status . '.', 422);
        }

        $data = $request->validate([
            'note' => ['required', 'string', 'max:500'],
        ]);

        $correction->update([
            'status'        => 'rejected',
            'reviewed_by'   => $request->user()->id,
            'reviewer_note' => $data['note'],
            'reviewed_at'   => now(),
        ]);

        $this->audit->log('attendance.correction_rejected', target: $correction, actor: $request->user());

        return ApiResponse::success(['correction' => $correction->fresh()]);
    }
}

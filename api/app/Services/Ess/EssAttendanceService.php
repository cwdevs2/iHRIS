<?php

declare(strict_types=1);

namespace App\Services\Ess;

use App\Models\AttendanceCorrectionRequest;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Services\Audit\AuditLogger;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Handles employee clock-in / clock-out and attendance correction requests.
 * All timestamps are stored in UTC; callers must pass UTC Carbon instances.
 */
class EssAttendanceService
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * Clock an employee in for today.
     * Creates an AttendanceLog row if none exists; throws if already clocked in.
     */
    public function clockIn(Employee $employee, Carbon $now, array $meta = []): AttendanceLog
    {
        $today = $now->toDateString();

        $existing = AttendanceLog::where('employee_id', $employee->id)
            ->where('work_date', $today)
            ->first();

        if ($existing?->clock_in_at !== null) {
            throw new \RuntimeException('Already clocked in today.');
        }

        $log = AttendanceLog::updateOrCreate(
            ['employee_id' => $employee->id, 'work_date' => $today],
            [
                'clock_in_at'  => $now,
                'clock_in_ip'  => $meta['ip'] ?? null,
                'clock_in_lat' => $meta['lat'] ?? null,
                'clock_in_lng' => $meta['lng'] ?? null,
                'location_type'=> $meta['location_type'] ?? 'on_site',
                'source'       => $meta['source'] ?? 'web',
                'status'       => 'present',
            ],
        );

        $this->audit->log(
            'attendance.clock_in',
            target: $log,
            after: ['clock_in_at' => $now->toIso8601String()],
            actor: $employee->user,
        );

        return $log;
    }

    /**
     * Clock an employee out. Computes hours worked.
     * Throws if not clocked in or already clocked out.
     */
    public function clockOut(Employee $employee, Carbon $now, array $meta = []): AttendanceLog
    {
        $today = $now->toDateString();

        $log = AttendanceLog::where('employee_id', $employee->id)
            ->where('work_date', $today)
            ->first();

        if (! $log || ! $log->clock_in_at) {
            throw new \RuntimeException('Cannot clock out: no clock-in record for today.');
        }

        if ($log->clock_out_at !== null) {
            throw new \RuntimeException('Already clocked out today.');
        }

        $clockIn  = Carbon::parse($log->clock_in_at);
        $totalMin = $clockIn->diffInMinutes($now);
        $totalHrs = round($totalMin / 60, 2);

        // Standard shift = 8h; overtime = anything beyond 8h (subject to approval)
        $regularHrs  = min($totalHrs, 8.0);
        $overtimeHrs = max(0, $totalHrs - 8.0);

        $log->update([
            'clock_out_at'    => $now,
            'clock_out_ip'    => $meta['ip'] ?? null,
            'clock_out_lat'   => $meta['lat'] ?? null,
            'clock_out_lng'   => $meta['lng'] ?? null,
            'regular_hours'   => $regularHrs,
            'overtime_hours'  => $overtimeHrs,
        ]);

        $this->audit->log(
            'attendance.clock_out',
            target: $log,
            after: ['clock_out_at' => $now->toIso8601String(), 'regular_hours' => $regularHrs],
            actor: $employee->user,
        );

        return $log->fresh();
    }

    /** Fetch the employee's attendance logs, most-recent first. */
    public function getLogs(Employee $employee, int $perPage = 20, array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return AttendanceLog::where('employee_id', $employee->id)
            ->when(isset($filters['from']), fn ($q) => $q->whereDate('work_date', '>=', $filters['from']))
            ->when(isset($filters['to']),   fn ($q) => $q->whereDate('work_date', '<=', $filters['to']))
            ->orderByDesc('work_date')
            ->paginate($perPage);
    }

    /** Today's log for the employee (or null). */
    public function getTodayLog(Employee $employee): ?AttendanceLog
    {
        return AttendanceLog::where('employee_id', $employee->id)
            ->where('work_date', now()->toDateString())
            ->first();
    }

    /** File an attendance correction request. */
    public function fileCorrection(Employee $employee, array $data, ?\App\Models\User $actor = null): AttendanceCorrectionRequest
    {
        $existing = AttendanceLog::where('employee_id', $employee->id)
            ->where('work_date', $data['work_date'])
            ->first();

        $request = AttendanceCorrectionRequest::create([
            'employee_id'          => $employee->id,
            'attendance_log_id'    => $existing?->id,
            'work_date'            => $data['work_date'],
            'requested_clock_in'   => $data['requested_clock_in'] ?? null,
            'requested_clock_out'  => $data['requested_clock_out'] ?? null,
            'reason'               => $data['reason'],
            'status'               => 'pending',
        ]);

        $this->audit->log(
            'attendance.correction_filed',
            target: $request,
            after: $request->toArray(),
            actor: $actor,
        );

        return $request;
    }

    /** Get the employee's own correction requests. */
    public function getCorrections(Employee $employee, int $perPage = 15): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return AttendanceCorrectionRequest::where('employee_id', $employee->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }
}

<?php

declare(strict_types=1);

namespace App\Services\Ess;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Services\Audit\AuditLogger;

class EssLeaveService
{
    public function __construct(private AuditLogger $audit) {}

    /** All active leave types. */
    public function getLeaveTypes(): \Illuminate\Database\Eloquent\Collection
    {
        return LeaveType::where('is_active', true)->orderBy('name')->get();
    }

    /**
     * Get the employee's leave balances for the current year.
     * Auto-provisions balance rows using the type's default_credits if none exist.
     */
    public function getBalances(Employee $employee, ?int $year = null): array
    {
        $year ??= now()->year;
        $types = $this->getLeaveTypes();

        $balances = [];
        foreach ($types as $type) {
            $balance = LeaveBalance::firstOrCreate(
                ['employee_id' => $employee->id, 'leave_type_id' => $type->id, 'year' => $year],
                ['credits' => $type->default_credits, 'used' => 0, 'pending' => 0],
            );
            $balances[] = [
                'leave_type'  => ['id' => $type->id, 'code' => $type->code, 'name' => $type->name],
                'credits'     => (float) $balance->credits,
                'used'        => (float) $balance->used,
                'pending'     => (float) $balance->pending,
                'available'   => $balance->available,
            ];
        }

        return $balances;
    }

    /**
     * File a leave request. Validates balance availability before persisting.
     */
    public function fileLeave(Employee $employee, array $data): LeaveRequest
    {
        $type = LeaveType::findOrFail($data['leave_type_id']);
        $year = now()->year;

        // Check balance (skip for types with default_credits = 0 = unlimited)
        if ($type->default_credits > 0) {
            $balance = LeaveBalance::firstOrCreate(
                ['employee_id' => $employee->id, 'leave_type_id' => $type->id, 'year' => $year],
                ['credits' => $type->default_credits, 'used' => 0, 'pending' => 0],
            );

            if ($balance->available < (float) $data['total_days']) {
                throw new \RuntimeException("Insufficient leave balance. Available: {$balance->available} days.");
            }

            // Reserve the days as pending
            $balance->increment('pending', (float) $data['total_days']);
        }

        $request = LeaveRequest::create([
            'employee_id'     => $employee->id,
            'leave_type_id'   => $type->id,
            'start_date'      => $data['start_date'],
            'end_date'        => $data['end_date'],
            'total_days'      => $data['total_days'],
            'reason'          => $data['reason'],
            'attachment_path' => $data['attachment_path'] ?? null,
            'status'          => 'pending',
        ]);

        $this->audit->log(
            'leave.filed',
            target: $request,
            after: $request->toArray(),
            actor: $employee->user,
        );

        return $request->load(['leaveType:id,code,name']);
    }

    /** Cancel a pending leave request (only by the filing employee). */
    public function cancelLeave(LeaveRequest $request, Employee $employee): LeaveRequest
    {
        if ($request->employee_id !== $employee->id) {
            throw new \RuntimeException('Unauthorized.');
        }
        if ($request->status !== 'pending') {
            throw new \RuntimeException('Only pending requests can be cancelled.');
        }

        // Return the reserved pending days
        if ($request->leaveType->default_credits > 0) {
            LeaveBalance::where('employee_id', $employee->id)
                ->where('leave_type_id', $request->leave_type_id)
                ->where('year', $request->start_date->year)
                ->decrement('pending', (float) $request->total_days);
        }

        $request->update(['status' => 'cancelled']);

        $this->audit->log('leave.cancelled', target: $request, after: ['status' => 'cancelled'], actor: $employee->user);

        return $request;
    }

    /** Paginated list of the employee's own leave requests. */
    public function getRequests(Employee $employee, int $perPage = 15, array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return LeaveRequest::with(['leaveType:id,code,name'])
            ->where('employee_id', $employee->id)
            ->when(isset($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }
}

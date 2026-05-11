<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Leaves;

use App\Http\Controllers\Controller;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminLeaveController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * GET /admin/leave
     * All leave requests (filterable by status, employee_id, leave_type_id).
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) ($request->input('per_page', 20)), 100);

        $requests = LeaveRequest::with(['employee.user', 'employee.department', 'leaveType'])
            ->when($request->filled('employee_id'),   fn ($q) => $q->where('employee_id', $request->input('employee_id')))
            ->when($request->filled('status'),        fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('leave_type_id'), fn ($q) => $q->where('leave_type_id', $request->input('leave_type_id')))
            ->when($request->filled('from'),          fn ($q) => $q->whereDate('start_date', '>=', $request->input('from')))
            ->when($request->filled('to'),            fn ($q) => $q->whereDate('start_date', '<=', $request->input('to')))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success([
            'requests' => $requests->items(),
            'pagination' => [
                'total'        => $requests->total(),
                'per_page'     => $requests->perPage(),
                'current_page' => $requests->currentPage(),
                'last_page'    => $requests->lastPage(),
            ],
        ]);
    }

    /**
     * POST /admin/leave/{id}/approve
     * Approve a pending leave request.
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        $leaveRequest = LeaveRequest::with('employee')->findOrFail($id);

        if ($leaveRequest->status !== 'pending') {
            return ApiResponse::error('Leave request is already ' . $leaveRequest->status . '.', 422);
        }

        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $actor = $request->user();
        $totalDays = (float) $leaveRequest->total_days;

        // Update balance: pending → used
        LeaveBalance::where('employee_id', $leaveRequest->employee_id)
            ->where('leave_type_id', $leaveRequest->leave_type_id)
            ->where('year', now()->year)
            ->first()?->decrement('pending', $totalDays);

        LeaveBalance::where('employee_id', $leaveRequest->employee_id)
            ->where('leave_type_id', $leaveRequest->leave_type_id)
            ->where('year', now()->year)
            ->first()?->increment('used', $totalDays);

        $approvals   = $leaveRequest->approvals ?? [];
        $approvals[] = [
            'level'       => 1,
            'approver_id' => $actor->id,
            'status'      => 'approved',
            'note'        => $data['note'] ?? null,
            'decided_at'  => now()->toIso8601String(),
        ];

        $leaveRequest->update([
            'status'    => 'approved',
            'approvals' => $approvals,
        ]);

        $this->audit->log('leave.approved', target: $leaveRequest, actor: $actor);

        return ApiResponse::success(['request' => $leaveRequest->fresh(['employee.user', 'leaveType'])]);
    }

    /**
     * POST /admin/leave/{id}/reject
     * Reject a pending leave request, releasing the reserved pending balance.
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $leaveRequest = LeaveRequest::with('employee')->findOrFail($id);

        if ($leaveRequest->status !== 'pending') {
            return ApiResponse::error('Leave request is already ' . $leaveRequest->status . '.', 422);
        }

        $data = $request->validate([
            'note' => ['required', 'string', 'max:500'],
        ]);

        $actor     = $request->user();
        $totalDays = (float) $leaveRequest->total_days;

        // Release the pending reservation
        LeaveBalance::where('employee_id', $leaveRequest->employee_id)
            ->where('leave_type_id', $leaveRequest->leave_type_id)
            ->where('year', now()->year)
            ->first()?->decrement('pending', $totalDays);

        $approvals   = $leaveRequest->approvals ?? [];
        $approvals[] = [
            'level'       => 1,
            'approver_id' => $actor->id,
            'status'      => 'rejected',
            'note'        => $data['note'],
            'decided_at'  => now()->toIso8601String(),
        ];

        $leaveRequest->update([
            'status'    => 'rejected',
            'approvals' => $approvals,
        ]);

        $this->audit->log('leave.rejected', target: $leaveRequest, actor: $actor);

        return ApiResponse::success(['request' => $leaveRequest->fresh(['employee.user', 'leaveType'])]);
    }

    // ─── Leave Types ──────────────────────────────────────────────────────────

    /** GET /admin/leave/types — all leave types including inactive */
    public function types(): JsonResponse
    {
        $types = LeaveType::orderBy('name')->get();

        return ApiResponse::success(['types' => $types]);
    }

    /** POST /admin/leave/types — create a custom leave type */
    public function storeType(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'                => ['required', 'string', 'max:30', 'unique:leave_types,code'],
            'name'                => ['required', 'string', 'max:100'],
            'description'         => ['nullable', 'string', 'max:500'],
            'default_credits'     => ['required', 'integer', 'min:0'],
            'requires_attachment' => ['boolean'],
            'is_paid'             => ['boolean'],
            'is_active'           => ['boolean'],
        ]);

        $type = LeaveType::create([...$data, 'is_system' => false]);

        $this->audit->log('leave_type.created', target: $type, actor: $request->user());

        return ApiResponse::success(['type' => $type], 201);
    }

    /** PATCH /admin/leave/types/{id} */
    public function updateType(Request $request, string $id): JsonResponse
    {
        $type = LeaveType::findOrFail($id);

        $data = $request->validate([
            'name'                => ['sometimes', 'string', 'max:100'],
            'description'         => ['nullable', 'string', 'max:500'],
            'default_credits'     => ['sometimes', 'integer', 'min:0'],
            'requires_attachment' => ['sometimes', 'boolean'],
            'is_paid'             => ['sometimes', 'boolean'],
            'is_active'           => ['sometimes', 'boolean'],
        ]);

        $type->update($data);

        $this->audit->log('leave_type.updated', target: $type, actor: $request->user());

        return ApiResponse::success(['type' => $type->fresh()]);
    }

    // ─── Leave Balances ───────────────────────────────────────────────────────

    /**
     * GET /admin/leave/balances?employee_id=&year=
     * View an employee's leave balances.
     */
    public function balances(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => ['required', 'uuid', 'exists:employees,id'],
            'year'        => ['sometimes', 'integer', 'min:2020'],
        ]);

        $year   = (int) ($data['year'] ?? now()->year);
        $types  = LeaveType::where('is_active', true)->orderBy('name')->get();

        $balances = [];
        foreach ($types as $type) {
            $balance = LeaveBalance::firstOrCreate(
                ['employee_id' => $data['employee_id'], 'leave_type_id' => $type->id, 'year' => $year],
                ['credits' => $type->default_credits, 'used' => 0, 'pending' => 0],
            );
            $balances[] = [
                'id'         => $balance->id,
                'leave_type' => ['id' => $type->id, 'code' => $type->code, 'name' => $type->name],
                'credits'    => (float) $balance->credits,
                'used'       => (float) $balance->used,
                'pending'    => (float) $balance->pending,
                'available'  => $balance->available,
                'year'       => $year,
            ];
        }

        return ApiResponse::success(['balances' => $balances]);
    }

    /**
     * PATCH /admin/leave/balances/{id}
     * Adjust the credit allocation for a specific balance row.
     */
    public function adjustBalance(Request $request, string $id): JsonResponse
    {
        $balance = LeaveBalance::findOrFail($id);

        $data = $request->validate([
            'credits' => ['required', 'numeric', 'min:0'],
            'reason'  => ['nullable', 'string', 'max:500'],
        ]);

        $before = $balance->credits;
        $balance->update(['credits' => $data['credits']]);

        $this->audit->log(
            'leave_balance.adjusted',
            target: $balance,
            before: ['credits' => $before],
            after: ['credits' => $data['credits'], 'reason' => $data['reason'] ?? null],
            actor: $request->user(),
        );

        return ApiResponse::success(['balance' => $balance->fresh()]);
    }
}

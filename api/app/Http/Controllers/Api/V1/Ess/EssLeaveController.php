<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Ess;

use App\Http\Controllers\Controller;
use App\Services\Ess\EssLeaveService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EssLeaveController extends Controller
{
    public function __construct(private EssLeaveService $svc) {}

    /** GET /ess/leave/types */
    public function types(): JsonResponse
    {
        return ApiResponse::success(['types' => $this->svc->getLeaveTypes()]);
    }

    /** GET /ess/leave/balances */
    public function balances(Request $request): JsonResponse
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        $year = (int) ($request->input('year', now()->year));

        return ApiResponse::success(['balances' => $this->svc->getBalances($employee, $year)]);
    }

    /** GET /ess/leave — employee's own leave requests */
    public function index(Request $request): JsonResponse
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        $perPage  = min((int) ($request->input('per_page', 15)), 100);
        $filters  = $request->only(['status']);
        $requests = $this->svc->getRequests($employee, $perPage, $filters);

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

    /** POST /ess/leave */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'leave_type_id' => ['required', 'uuid', 'exists:leave_types,id'],
            'start_date'    => ['required', 'date', 'after_or_equal:today'],
            'end_date'      => ['required', 'date', 'after_or_equal:start_date'],
            'total_days'    => ['required', 'numeric', 'min:0.5', 'max:365'],
            'reason'        => ['required', 'string', 'max:1000'],
        ]);

        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        try {
            $leaveRequest = $this->svc->fileLeave($employee, $data);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(['request' => $leaveRequest], 201);
    }

    /** DELETE /ess/leave/{id} — cancel */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        $leaveRequest = \App\Models\LeaveRequest::findOrFail($id);

        try {
            $updated = $this->svc->cancelLeave($leaveRequest, $employee);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(['request' => $updated]);
    }
}

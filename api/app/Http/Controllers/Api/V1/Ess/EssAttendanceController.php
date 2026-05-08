<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Ess;

use App\Http\Controllers\Controller;
use App\Services\Ess\EssAttendanceService;
use App\Support\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EssAttendanceController extends Controller
{
    public function __construct(private EssAttendanceService $svc) {}

    /** GET /ess/attendance — employee's paginated attendance log */
    public function index(Request $request): JsonResponse
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        $perPage = min((int) ($request->input('per_page', 20)), 100);
        $filters = $request->only(['from', 'to']);

        $logs = $this->svc->getLogs($employee, $perPage, $filters);

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

    /** GET /ess/attendance/today — today's status for the clock widget */
    public function today(Request $request): JsonResponse
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        $log = $this->svc->getTodayLog($employee);

        return ApiResponse::success(['log' => $log]);
    }

    /** POST /ess/attendance/clock-in */
    public function clockIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat'           => ['nullable', 'numeric', 'between:-90,90'],
            'lng'           => ['nullable', 'numeric', 'between:-180,180'],
            'location_type' => ['nullable', 'in:on_site,remote,field'],
        ]);

        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        try {
            $log = $this->svc->clockIn($employee, Carbon::now(), [
                'ip'            => $request->ip(),
                'lat'           => $data['lat'] ?? null,
                'lng'           => $data['lng'] ?? null,
                'location_type' => $data['location_type'] ?? 'on_site',
                'source'        => 'web',
            ]);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(['log' => $log], 201);
    }

    /** POST /ess/attendance/clock-out */
    public function clockOut(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        try {
            $log = $this->svc->clockOut($employee, Carbon::now(), [
                'ip'  => $request->ip(),
                'lat' => $data['lat'] ?? null,
                'lng' => $data['lng'] ?? null,
            ]);
        } catch (\RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), 422);
        }

        return ApiResponse::success(['log' => $log]);
    }

    /** GET /ess/attendance/corrections */
    public function corrections(Request $request): JsonResponse
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        $perPage = min((int) ($request->input('per_page', 15)), 100);
        $corrections = $this->svc->getCorrections($employee, $perPage);

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

    /** POST /ess/attendance/corrections */
    public function fileCorrection(Request $request): JsonResponse
    {
        $data = $request->validate([
            'work_date'            => ['required', 'date', 'before_or_equal:today'],
            'requested_clock_in'   => ['nullable', 'date_format:H:i'],
            'requested_clock_out'  => ['nullable', 'date_format:H:i'],
            'reason'               => ['required', 'string', 'max:500'],
        ]);

        $employee = $request->user()->employee;

        if (! $employee) {
            return ApiResponse::error('No employee profile linked to this account.', 422);
        }

        $correction = $this->svc->fileCorrection($employee, $data, $request->user());

        return ApiResponse::success(['correction' => $correction], 201);
    }
}

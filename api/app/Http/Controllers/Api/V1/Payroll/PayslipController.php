<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Resources\PayslipResource;
use App\Models\Payslip;
use App\Services\Payroll\PayslipDocumentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PayslipController extends Controller
{
    public function __construct(private PayslipDocumentService $documents) {}

    /** GET /payroll/payslips — admin/all-access listing */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 15), 100);

        $query = Payslip::query()
            ->with(['employee.user', 'run.period'])
            ->when($request->query('payroll_run_id'),
                fn ($q, $v) => $q->where('payroll_run_id', $v))
            ->when($request->query('employee_id'),
                fn ($q, $v) => $q->where('employee_id', $v))
            ->when($request->query('status'),
                fn ($q, $v) => $q->where('status', $v))
            ->orderByDesc('created_at');

        $paginator = $query->paginate($perPage);

        return ApiResponse::success([
            'payslips' => PayslipResource::collection($paginator),
            'pagination' => [
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    /** GET /payroll/payslips/own — ESS endpoint */
    public function own(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = $user?->employee;

        if (! $employee) {
            return ApiResponse::fail([
                'message' => 'Your account is not linked to an employee record.',
            ]);
        }

        $payslips = Payslip::query()
            ->with(['run.period'])
            ->where('employee_id', $employee->id)
            ->whereIn('status', ['finalized', 'paid'])
            ->orderByDesc('generated_at')
            ->get();

        return ApiResponse::success([
            'payslips' => PayslipResource::collection($payslips),
        ]);
    }

    /** GET /payroll/payslips/{id} */
    public function show(Request $request, string $id): JsonResponse
    {
        $payslip = $this->findOrFailWithGuard($request, $id);

        $payslip->load(['employee.user', 'employee.department', 'employee.position', 'run.period', 'items']);

        return ApiResponse::success(['payslip' => new PayslipResource($payslip)]);
    }

    /** GET /payroll/payslips/{id}/document — printable HTML; browsers can save as PDF */
    public function document(Request $request, string $id): Response
    {
        $payslip = $this->findOrFailWithGuard($request, $id);

        $html = $this->documents->renderHtml($payslip);

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=utf-8',
            'X-Content-Type-Options' => 'nosniff',
            // Allow embedding in same-origin frames (the SPA can iframe + window.print()).
            'Content-Security-Policy' => "frame-ancestors 'self'",
        ]);
    }

    /**
     * Resolve a payslip ID with permission check:
     *   - users with `payroll.payslips.view_all` → any payslip
     *   - others must own the payslip via their linked employee record
     */
    private function findOrFailWithGuard(Request $request, string $id): Payslip
    {
        $payslip = Payslip::find($id);
        if (! $payslip) {
            abort(404, 'Payslip not found.');
        }

        $user = $request->user();
        if ($user?->hasPermission('payroll', 'payslips', 'view_all')) {
            return $payslip;
        }

        if ($user?->employee && $user->employee->id === $payslip->employee_id) {
            return $payslip;
        }

        abort(403, 'You do not have permission to view this payslip.');
    }
}

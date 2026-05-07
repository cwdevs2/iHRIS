<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Admin\AuditLogController;
use App\Http\Controllers\Api\V1\Admin\RoleController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\MfaController;
use App\Http\Controllers\Api\V1\Employee\DocumentController;
use App\Http\Controllers\Api\V1\Employee\EmployeeController;
use App\Http\Controllers\Api\V1\Onboarding\OnboardingController;
use App\Http\Controllers\Api\V1\Organization\DepartmentController;
use App\Http\Controllers\Api\V1\Payroll\ComplianceReportController;
use App\Http\Controllers\Api\V1\Payroll\FinalPayController;
use App\Http\Controllers\Api\V1\Payroll\LoanController;
use App\Http\Controllers\Api\V1\Payroll\PayrollPeriodController;
use App\Http\Controllers\Api\V1\Payroll\PayrollRunController;
use App\Http\Controllers\Api\V1\Payroll\PayslipController;
use App\Http\Controllers\Api\V1\Payroll\ThirteenthMonthController;
use App\Http\Controllers\Api\V1\Tickets\TicketController;
use App\Http\Controllers\Api\V1\Organization\OrgChartController;
use App\Http\Controllers\Api\V1\Organization\PositionController;
use App\Http\Controllers\Api\V1\User\UserController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1 Routes (mounted at /api/v1 by bootstrap/app.php apiPrefix)
|--------------------------------------------------------------------------
*/

Route::get('/health', fn () => ApiResponse::success([
    'service' => 'iHRIS API',
    'version' => 'v1',
    'time' => now()->toIso8601String(),
]));

// Public auth endpoints
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->name('auth.login');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('auth.forgot');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('auth.reset');
});

// Authenticated endpoints
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('/me', [AuthController::class, 'me'])->name('auth.me');
    });

    // MFA challenge verification (scoped challenge token — no full session required).
    Route::post('/auth/mfa/verify', [MfaController::class, 'verify'])->name('auth.mfa.verify');

    // MFA management (requires full authenticated session).
    Route::prefix('auth/mfa')->group(function () {
        Route::post('/setup', [MfaController::class, 'setup'])->name('auth.mfa.setup');
        Route::post('/confirm', [MfaController::class, 'confirm'])->name('auth.mfa.confirm');
        Route::post('/disable', [MfaController::class, 'disable'])->name('auth.mfa.disable');
    });

    // Module routes get registered here as the project grows.

    // ── Phase 1: Core HR ────────────────────────────────────────────────────

    // Employees
    Route::middleware('permission:hr.employees.view')->group(function () {
        Route::get('/employees', [EmployeeController::class, 'index'])->name('employees.index');
        Route::get('/employees/{id}', [EmployeeController::class, 'show'])->name('employees.show');
    });
    Route::middleware('permission:hr.employees.create')
        ->post('/employees', [EmployeeController::class, 'store'])->name('employees.store');
    Route::middleware('permission:hr.employees.edit')
        ->patch('/employees/{id}', [EmployeeController::class, 'update'])->name('employees.update');
    Route::middleware('permission:hr.employees.delete')
        ->delete('/employees/{id}', [EmployeeController::class, 'destroy'])->name('employees.destroy');

    // Departments
    Route::middleware('permission:hr.departments.view')->group(function () {
        Route::get('/departments', [DepartmentController::class, 'index'])->name('departments.index');
        Route::get('/departments/{id}', [DepartmentController::class, 'show'])->name('departments.show');
    });
    Route::middleware('permission:hr.departments.create')
        ->post('/departments', [DepartmentController::class, 'store'])->name('departments.store');
    Route::middleware('permission:hr.departments.edit')
        ->patch('/departments/{id}', [DepartmentController::class, 'update'])->name('departments.update');
    Route::middleware('permission:hr.departments.delete')
        ->delete('/departments/{id}', [DepartmentController::class, 'destroy'])->name('departments.destroy');

    // Positions
    Route::middleware('permission:hr.positions.view')->group(function () {
        Route::get('/positions', [PositionController::class, 'index'])->name('positions.index');
        Route::get('/positions/{id}', [PositionController::class, 'show'])->name('positions.show');
    });
    Route::middleware('permission:hr.positions.create')
        ->post('/positions', [PositionController::class, 'store'])->name('positions.store');
    Route::middleware('permission:hr.positions.edit')
        ->patch('/positions/{id}', [PositionController::class, 'update'])->name('positions.update');
    Route::middleware('permission:hr.positions.delete')
        ->delete('/positions/{id}', [PositionController::class, 'destroy'])->name('positions.destroy');

    // ── Users ───────────────────────────────────────────────────────────────

    Route::middleware('permission:users.accounts.view')->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::get('/users/{id}', [UserController::class, 'show'])->name('users.show');
    });
    Route::middleware('permission:users.accounts.create')
        ->post('/users', [UserController::class, 'store'])->name('users.store');
    Route::middleware('permission:users.accounts.edit')
        ->patch('/users/{id}', [UserController::class, 'update'])->name('users.update');
    Route::middleware('permission:users.accounts.delete')
        ->delete('/users/{id}', [UserController::class, 'destroy'])->name('users.destroy');

    // ── Org Chart ───────────────────────────────────────────────────────────
    Route::middleware('permission:hr.departments.view')
        ->get('/org-chart', [OrgChartController::class, 'index'])->name('org-chart.index');

    // ── Documents ──────────────────────────────────────────────────────────
    Route::middleware('permission:hr.employees.view')->group(function () {
        Route::get('/employees/{employeeId}/documents', [DocumentController::class, 'index'])->name('documents.index');
        Route::get('/documents/{id}', [DocumentController::class, 'show'])->name('documents.show');
        Route::get('/documents/{id}/download', [DocumentController::class, 'download'])->name('documents.download');
    });
    Route::middleware('permission:hr.employees.edit')
        ->post('/employees/{employeeId}/documents', [DocumentController::class, 'store'])->name('documents.store');
    Route::middleware('permission:hr.employees.delete')
        ->delete('/documents/{id}', [DocumentController::class, 'destroy'])->name('documents.destroy');

    // ── Onboarding ─────────────────────────────────────────────────────────
    Route::prefix('onboarding')->group(function () {
        Route::middleware('permission:hr.onboarding.view')->group(function () {
            Route::get('/checklists', [OnboardingController::class, 'checklists'])->name('onboarding.checklists.index');
            Route::get('/assignments', [OnboardingController::class, 'assignments'])->name('onboarding.assignments.index');
        });
        Route::middleware('permission:hr.onboarding.manage')->group(function () {
            Route::post('/checklists', [OnboardingController::class, 'storeChecklist'])->name('onboarding.checklists.store');
            Route::delete('/checklists/{id}', [OnboardingController::class, 'destroyChecklist'])->name('onboarding.checklists.destroy');
            Route::post('/assignments', [OnboardingController::class, 'assign'])->name('onboarding.assignments.store');
            Route::patch('/assignments/{assignmentId}/tasks/{taskId}', [OnboardingController::class, 'completeTask'])->name('onboarding.tasks.complete');
        });
    });

    // ── HR Tickets ─────────────────────────────────────────────────────────
    Route::prefix('tickets')->group(function () {
        Route::middleware('permission:hr.tickets.view')->group(function () {
            Route::get('/', [TicketController::class, 'index'])->name('tickets.index');
            Route::get('/{id}', [TicketController::class, 'show'])->name('tickets.show');
        });
        Route::middleware('permission:hr.tickets.create')
            ->post('/', [TicketController::class, 'store'])->name('tickets.store');
        Route::middleware('permission:hr.tickets.manage')->group(function () {
            Route::patch('/{id}', [TicketController::class, 'update'])->name('tickets.update');
            Route::post('/{id}/notes', [TicketController::class, 'addNote'])->name('tickets.notes.store');
        });
        // Employees can also add notes to their own tickets
        Route::middleware('permission:hr.tickets.create')
            ->post('/{id}/notes', [TicketController::class, 'addNote'])->name('tickets.notes.store.own');
    });

    // ── Roles (read-only, for assignment dropdowns) ──────────────────────────
    Route::middleware('permission:core.roles.view')
        ->get('/roles', [RoleController::class, 'index'])->name('roles.index');

    // ── Audit Logs ──────────────────────────────────────────────────────────
    Route::middleware('permission:core.audit_logs.view')
        ->get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

    // ── Phase 4: Payroll ────────────────────────────────────────────────────

    Route::prefix('payroll')->group(function () {
        // Periods
        Route::middleware('permission:payroll.periods.view')->group(function () {
            Route::get('/periods', [PayrollPeriodController::class, 'index'])->name('payroll.periods.index');
            Route::get('/periods/{id}', [PayrollPeriodController::class, 'show'])->name('payroll.periods.show');
        });
        Route::middleware('permission:payroll.periods.manage')->group(function () {
            Route::post('/periods', [PayrollPeriodController::class, 'store'])->name('payroll.periods.store');
            Route::patch('/periods/{id}', [PayrollPeriodController::class, 'update'])->name('payroll.periods.update');
            Route::delete('/periods/{id}', [PayrollPeriodController::class, 'destroy'])->name('payroll.periods.destroy');
        });

        // Runs
        Route::middleware('permission:payroll.runs.view')->group(function () {
            Route::get('/runs', [PayrollRunController::class, 'index'])->name('payroll.runs.index');
            Route::get('/runs/{id}', [PayrollRunController::class, 'show'])->name('payroll.runs.show');
        });
        Route::middleware('permission:payroll.runs.create')
            ->post('/runs', [PayrollRunController::class, 'store'])->name('payroll.runs.store');
        Route::middleware('permission:payroll.runs.edit')
            ->post('/runs/{id}/generate', [PayrollRunController::class, 'generate'])->name('payroll.runs.generate');
        Route::middleware('permission:payroll.runs.finalize')
            ->patch('/runs/{id}/finalize', [PayrollRunController::class, 'finalize'])->name('payroll.runs.finalize');
        Route::middleware('permission:payroll.runs.mark_paid')
            ->patch('/runs/{id}/mark-paid', [PayrollRunController::class, 'markPaid'])->name('payroll.runs.mark_paid');
        Route::middleware('permission:payroll.runs.cancel')
            ->patch('/runs/{id}/cancel', [PayrollRunController::class, 'cancel'])->name('payroll.runs.cancel');

        // Payslips
        // ESS endpoint — visible to anyone with view_own (employees) and to view_all admins.
        Route::middleware('permission:payroll.payslips.view_own')
            ->get('/payslips/own', [PayslipController::class, 'own'])->name('payroll.payslips.own');
        Route::middleware('permission:payroll.payslips.view_all')
            ->get('/payslips', [PayslipController::class, 'index'])->name('payroll.payslips.index');
        // Show + document use a runtime guard inside the controller so an employee
        // can fetch their *own* payslip without needing view_all permission.
        Route::middleware('permission:payroll.payslips.view_own')->group(function () {
            Route::get('/payslips/{id}', [PayslipController::class, 'show'])->name('payroll.payslips.show');
            Route::get('/payslips/{id}/document', [PayslipController::class, 'document'])->name('payroll.payslips.document');
        });

        // Loans
        Route::middleware('permission:payroll.loans.view')->group(function () {
            Route::get('/loans', [LoanController::class, 'index'])->name('payroll.loans.index');
            Route::get('/loans/{id}', [LoanController::class, 'show'])->name('payroll.loans.show');
        });
        Route::middleware('permission:payroll.loans.manage')->group(function () {
            Route::post('/loans', [LoanController::class, 'store'])->name('payroll.loans.store');
            Route::patch('/loans/{id}', [LoanController::class, 'update'])->name('payroll.loans.update');
        });

        // Compliance reports
        Route::middleware('permission:payroll.reports.view')->group(function () {
            Route::get('/reports/sss', [ComplianceReportController::class, 'sss'])->name('payroll.reports.sss');
            Route::get('/reports/philhealth', [ComplianceReportController::class, 'philhealth'])->name('payroll.reports.philhealth');
            Route::get('/reports/pagibig', [ComplianceReportController::class, 'pagibig'])->name('payroll.reports.pagibig');
            Route::get('/reports/bir-alpha-list', [ComplianceReportController::class, 'birAlphaList'])->name('payroll.reports.bir');
        });

        // 13th-month preview
        Route::middleware('permission:payroll.thirteenth_month.manage')->group(function () {
            Route::get('/thirteenth-month', [ThirteenthMonthController::class, 'index'])->name('payroll.thirteenth_month.index');
            Route::get('/thirteenth-month/{employeeId}', [ThirteenthMonthController::class, 'show'])->name('payroll.thirteenth_month.show');
        });

        // Final pay computation
        Route::middleware('permission:payroll.final_pay.manage')
            ->post('/final-pay/compute', [FinalPayController::class, 'compute'])->name('payroll.final_pay.compute');
    });
});

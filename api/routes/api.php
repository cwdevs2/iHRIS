<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\Admin\AuditLogController;
use App\Http\Controllers\Api\V1\Admin\RoleController;
use App\Http\Controllers\Api\V1\Assets\AssetController;
use App\Http\Controllers\Api\V1\Attendance\AdminAttendanceController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\MfaController;
use App\Http\Controllers\Api\V1\Compliance\FilingController;
use App\Http\Controllers\Api\V1\Compliance\PolicyController;
use App\Http\Controllers\Api\V1\Employee\DocumentController;
use App\Http\Controllers\Api\V1\Employee\EmployeeController;
use App\Http\Controllers\Api\V1\Ess\EssAttendanceController;
use App\Http\Controllers\Api\V1\Ess\EssLeaveController;
use App\Http\Controllers\Api\V1\Ess\EssProfileController;
use App\Http\Controllers\Api\V1\Integrations\AccountingWebhookController;
use App\Http\Controllers\Api\V1\Integrations\ApiKeyController;
use App\Http\Controllers\Api\V1\Integrations\BiometricWebhookController;
use App\Http\Controllers\Api\V1\Integrations\IntegrationLogController;
use App\Http\Controllers\Api\V1\Integrations\WebhookController;
use App\Http\Controllers\Api\V1\Leaves\AdminLeaveController;
use App\Http\Controllers\Api\V1\Onboarding\OnboardingController;
use App\Http\Controllers\Api\V1\Reports\ReportsController;
use App\Http\Controllers\Api\V1\Performance\GoalController;
use App\Http\Controllers\Api\V1\Performance\PerformanceAnalyticsController;
use App\Http\Controllers\Api\V1\Performance\ReviewController;
use App\Http\Controllers\Api\V1\Performance\ReviewCycleController;
use App\Http\Controllers\Api\V1\Recruitment\ApplicantController;
use App\Http\Controllers\Api\V1\Recruitment\EvaluationController;
use App\Http\Controllers\Api\V1\Recruitment\InterviewController;
use App\Http\Controllers\Api\V1\Recruitment\JobPostingController;
use App\Http\Controllers\Api\V1\Recruitment\JobRequisitionController;
use App\Http\Controllers\Api\V1\Recruitment\OfferLetterController;
use App\Http\Controllers\Api\V1\Recruitment\RecruitmentAnalyticsController;
use App\Http\Controllers\Api\V1\Organization\DepartmentController;
use App\Http\Controllers\Api\V1\Organization\UserGroupController;
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

    // ── User Groups (department-scoped delegation) ──────────────────────────
    Route::middleware('permission:hr.user_groups.view')->group(function () {
        Route::get('/user-groups', [UserGroupController::class, 'index'])->name('user-groups.index');
        Route::get('/user-groups/{id}', [UserGroupController::class, 'show'])->name('user-groups.show');
    });
    Route::middleware('permission:hr.user_groups.create')
        ->post('/user-groups', [UserGroupController::class, 'store'])->name('user-groups.store');
    Route::middleware('permission:hr.user_groups.edit')
        ->patch('/user-groups/{id}', [UserGroupController::class, 'update'])->name('user-groups.update');
    Route::middleware('permission:hr.user_groups.delete')
        ->delete('/user-groups/{id}', [UserGroupController::class, 'destroy'])->name('user-groups.destroy');
    Route::middleware('permission:hr.user_groups.manage_members')->group(function () {
        Route::post('/user-groups/{id}/members', [UserGroupController::class, 'addMember'])->name('user-groups.members.add');
        Route::delete('/user-groups/{id}/members/{userId}', [UserGroupController::class, 'removeMember'])->name('user-groups.members.remove');
    });
    // Director routes use edit permission; the group director can also call member routes (enforced in service)
    Route::middleware('permission:hr.user_groups.edit')->group(function () {
        Route::put('/user-groups/{id}/director', [UserGroupController::class, 'assignDirector'])->name('user-groups.director.assign');
        Route::delete('/user-groups/{id}/director', [UserGroupController::class, 'removeDirector'])->name('user-groups.director.remove');
    });

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

    // ── Roles ───────────────────────────────────────────────────────────────
    Route::middleware('permission:core.roles.view')
        ->get('/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::middleware('permission:core.roles.create')
        ->post('/roles', [RoleController::class, 'store'])->name('roles.store');
    Route::middleware('permission:core.roles.edit')
        ->put('/roles/{id}', [RoleController::class, 'update'])->name('roles.update');
    Route::middleware('permission:core.roles.edit')
        ->patch('/roles/{id}/rename', [RoleController::class, 'rename'])->name('roles.rename');
    Route::middleware('permission:core.roles.create')
        ->post('/roles/{id}/clone', [RoleController::class, 'clone'])->name('roles.clone');
    Route::middleware('permission:core.roles.delete')
        ->delete('/roles/{id}', [RoleController::class, 'destroy'])->name('roles.destroy');

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

    // ── Phase 5: ESS Portal ─────────────────────────────────────────────────
    // All ESS routes require the user to have an employee record linked.
    // Permission `ess.self.access` is assigned to the Employee role by default.

    Route::prefix('ess')->middleware('permission:ess.self.access')->group(function () {
        // Attendance
        Route::get('/attendance',             [EssAttendanceController::class, 'index']);
        Route::get('/attendance/today',       [EssAttendanceController::class, 'today']);
        Route::post('/attendance/clock-in',   [EssAttendanceController::class, 'clockIn']);
        Route::post('/attendance/clock-out',  [EssAttendanceController::class, 'clockOut']);
        Route::get('/attendance/corrections', [EssAttendanceController::class, 'corrections']);
        Route::post('/attendance/corrections',[EssAttendanceController::class, 'fileCorrection']);

        // Leave
        Route::get('/leave/types',    [EssLeaveController::class, 'types']);
        Route::get('/leave/balances', [EssLeaveController::class, 'balances']);
        Route::get('/leave',          [EssLeaveController::class, 'index']);
        Route::post('/leave',         [EssLeaveController::class, 'store']);
        Route::delete('/leave/{id}',  [EssLeaveController::class, 'cancel']);

        // Profile
        Route::get('/profile',                        [EssProfileController::class, 'show']);
        Route::get('/profile/update-requests',        [EssProfileController::class, 'updateRequests']);
        Route::post('/profile/update-requests',       [EssProfileController::class, 'requestUpdate']);
    });

    // ── Admin Attendance Management ─────────────────────────────────────────

    Route::prefix('admin/attendance')->group(function () {
        Route::middleware('permission:attendance.logs.view')->group(function () {
            Route::get('/',            [AdminAttendanceController::class, 'index']);
            Route::get('/corrections', [AdminAttendanceController::class, 'corrections']);
        });
        Route::middleware('permission:attendance.logs.manage')->group(function () {
            Route::post('/manual',                          [AdminAttendanceController::class, 'manual']);
            Route::patch('/corrections/{id}/approve',       [AdminAttendanceController::class, 'approveCorrection']);
            Route::patch('/corrections/{id}/reject',        [AdminAttendanceController::class, 'rejectCorrection']);
        });
    });

    // ── Admin Leave Management ──────────────────────────────────────────────

    Route::prefix('admin/leave')->group(function () {
        Route::middleware('permission:leaves.requests.view')->group(function () {
            Route::get('/',        [AdminLeaveController::class, 'index']);
            Route::get('/types',   [AdminLeaveController::class, 'types']);
            Route::get('/balances',[AdminLeaveController::class, 'balances']);
        });
        Route::middleware('permission:leaves.requests.manage')->group(function () {
            Route::post('/{id}/approve',       [AdminLeaveController::class, 'approve']);
            Route::post('/{id}/reject',        [AdminLeaveController::class, 'reject']);
            Route::patch('/balances/{id}',     [AdminLeaveController::class, 'adjustBalance']);
            Route::post('/types',              [AdminLeaveController::class, 'storeType']);
            Route::patch('/types/{id}',        [AdminLeaveController::class, 'updateType']);
        });
    });

    // ── Phase 6: Recruitment ────────────────────────────────────────────────

    Route::prefix('recruitment')->group(function () {
        // Job Requisitions
        Route::middleware('permission:recruitment.jobs.view')->group(function () {
            Route::get('/requisitions',        [JobRequisitionController::class, 'index'])->name('recruitment.requisitions.index');
            Route::get('/requisitions/{id}',   [JobRequisitionController::class, 'show'])->name('recruitment.requisitions.show');
        });
        Route::middleware('permission:recruitment.jobs.manage')->group(function () {
            Route::post('/requisitions',             [JobRequisitionController::class, 'store'])->name('recruitment.requisitions.store');
            Route::patch('/requisitions/{id}',       [JobRequisitionController::class, 'update'])->name('recruitment.requisitions.update');
            Route::post('/requisitions/{id}/approve',[JobRequisitionController::class, 'approve'])->name('recruitment.requisitions.approve');
        });

        // Job Postings
        Route::middleware('permission:recruitment.jobs.view')->group(function () {
            Route::get('/postings',       [JobPostingController::class, 'index'])->name('recruitment.postings.index');
            Route::get('/postings/{id}',  [JobPostingController::class, 'show'])->name('recruitment.postings.show');
        });
        Route::middleware('permission:recruitment.jobs.manage')->group(function () {
            Route::post('/postings',        [JobPostingController::class, 'store'])->name('recruitment.postings.store');
            Route::patch('/postings/{id}',  [JobPostingController::class, 'update'])->name('recruitment.postings.update');
        });

        // Applicants
        Route::middleware('permission:recruitment.applicants.view')->group(function () {
            Route::get('/applicants',       [ApplicantController::class, 'index'])->name('recruitment.applicants.index');
            Route::get('/applicants/{id}',  [ApplicantController::class, 'show'])->name('recruitment.applicants.show');
        });
        Route::middleware('permission:recruitment.applicants.manage')->group(function () {
            Route::post('/applicants',                    [ApplicantController::class, 'store'])->name('recruitment.applicants.store');
            Route::patch('/applicants/{id}/stage',        [ApplicantController::class, 'advanceStage'])->name('recruitment.applicants.stage');
            Route::post('/applicants/{id}/resume',        [ApplicantController::class, 'uploadResume'])->name('recruitment.applicants.resume');
        });

        // Interviews
        Route::middleware('permission:recruitment.applicants.manage')->group(function () {
            Route::post('/interviews',        [InterviewController::class, 'store'])->name('recruitment.interviews.store');
            Route::patch('/interviews/{id}',  [InterviewController::class, 'update'])->name('recruitment.interviews.update');
        });

        // Evaluations
        Route::middleware('permission:recruitment.applicants.manage')
            ->post('/evaluations', [EvaluationController::class, 'store'])->name('recruitment.evaluations.store');

        // Offer Letters
        Route::middleware('permission:recruitment.jobs.manage')->group(function () {
            Route::post('/offers',              [OfferLetterController::class, 'store'])->name('recruitment.offers.store');
            Route::patch('/offers/{id}/status', [OfferLetterController::class, 'updateStatus'])->name('recruitment.offers.status');
        });

        // Analytics
        Route::middleware('permission:recruitment.jobs.view')
            ->get('/analytics', [RecruitmentAnalyticsController::class, 'index'])->name('recruitment.analytics');
    });

    // ── Phase 6: Performance ────────────────────────────────────────────────

    Route::prefix('performance')->group(function () {
        // Cycles
        Route::middleware('permission:performance.reviews.view')->group(function () {
            Route::get('/cycles',       [ReviewCycleController::class, 'index'])->name('performance.cycles.index');
            Route::get('/cycles/{id}',  [ReviewCycleController::class, 'show'])->name('performance.cycles.show');
        });
        Route::middleware('permission:performance.reviews.manage')->group(function () {
            Route::post('/cycles',                       [ReviewCycleController::class, 'store'])->name('performance.cycles.store');
            Route::patch('/cycles/{id}',                 [ReviewCycleController::class, 'update'])->name('performance.cycles.update');
            Route::post('/cycles/{id}/activate',         [ReviewCycleController::class, 'activate'])->name('performance.cycles.activate');
            Route::post('/cycles/{id}/close',            [ReviewCycleController::class, 'close'])->name('performance.cycles.close');
            Route::post('/cycles/{id}/initiate-reviews', [ReviewCycleController::class, 'initiateReviews'])->name('performance.cycles.initiate');
        });

        // Goals
        Route::middleware('permission:performance.reviews.view')->group(function () {
            Route::get('/goals', [GoalController::class, 'index'])->name('performance.goals.index');
        });
        Route::middleware('permission:performance.reviews.manage')->group(function () {
            Route::post('/goals',         [GoalController::class, 'store'])->name('performance.goals.store');
            Route::patch('/goals/{id}',   [GoalController::class, 'update'])->name('performance.goals.update');
            Route::delete('/goals/{id}',  [GoalController::class, 'destroy'])->name('performance.goals.destroy');
        });

        // Reviews
        Route::middleware('permission:performance.reviews.view')->group(function () {
            Route::get('/reviews',       [ReviewController::class, 'index'])->name('performance.reviews.index');
            Route::get('/reviews/{id}',  [ReviewController::class, 'show'])->name('performance.reviews.show');
        });
        Route::middleware('permission:performance.reviews.manage')->group(function () {
            Route::post('/reviews/{id}/submit',       [ReviewController::class, 'submit'])->name('performance.reviews.submit');
            Route::post('/reviews/{id}/acknowledge',  [ReviewController::class, 'acknowledge'])->name('performance.reviews.acknowledge');
        });

        // Analytics
        Route::middleware('permission:performance.reviews.view')
            ->get('/analytics', [PerformanceAnalyticsController::class, 'index'])->name('performance.analytics');
    });

    // ── Phase 7: Reports & Analytics ────────────────────────────────────────

    Route::prefix('reports')->middleware('permission:reports.analytics.view')->group(function () {
        Route::get('/summary', [ReportsController::class, 'summary'])->name('reports.summary');
        Route::get('/employees', [ReportsController::class, 'employees'])->name('reports.employees');
        Route::get('/attendance', [ReportsController::class, 'attendance'])->name('reports.attendance');
        Route::get('/leaves', [ReportsController::class, 'leaves'])->name('reports.leaves');
        Route::get('/payroll-register', [ReportsController::class, 'payrollRegister'])->name('reports.payroll_register');
        Route::get('/recruitment', [ReportsController::class, 'recruitment'])->name('reports.recruitment');
        Route::get('/performance', [ReportsController::class, 'performance'])->name('reports.performance');

        Route::middleware('permission:reports.analytics.export')
            ->get('/{type}/export', [ReportsController::class, 'export'])->name('reports.export');
    });

    // ── Phase 7: Asset Management ───────────────────────────────────────────

    Route::prefix('assets')->group(function () {
        Route::middleware('permission:assets.inventory.view')->group(function () {
            Route::get('/', [AssetController::class, 'index'])->name('assets.index');
            Route::get('/categories', [AssetController::class, 'categories'])->name('assets.categories.index');
            Route::get('/{id}', [AssetController::class, 'show'])->name('assets.show');
        });
        Route::middleware('permission:assets.inventory.manage')->group(function () {
            Route::post('/', [AssetController::class, 'store'])->name('assets.store');
            Route::patch('/{id}', [AssetController::class, 'update'])->name('assets.update');
            Route::post('/{id}/retire', [AssetController::class, 'retire'])->name('assets.retire');
            Route::post('/categories', [AssetController::class, 'storeCategory'])->name('assets.categories.store');
        });
        Route::middleware('permission:assets.assignments.manage')->group(function () {
            Route::post('/{id}/assign', [AssetController::class, 'assign'])->name('assets.assign');
            Route::post('/assignments/{assignmentId}/return', [AssetController::class, 'returnAsset'])->name('assets.return');
        });
        Route::middleware('permission:assets.maintenance.manage')
            ->post('/{id}/maintenance', [AssetController::class, 'logMaintenance'])->name('assets.maintenance.log');
    });

    // ── Phase 7: Compliance Management ──────────────────────────────────────

    Route::prefix('compliance')->group(function () {
        // Policies
        Route::middleware('permission:compliance.policies.view')->group(function () {
            Route::get('/policies', [PolicyController::class, 'index'])->name('compliance.policies.index');
            Route::get('/policies/{id}', [PolicyController::class, 'show'])->name('compliance.policies.show');
            Route::get('/coverage', [PolicyController::class, 'coverage'])->name('compliance.coverage');
        });
        Route::middleware('permission:compliance.policies.manage')->group(function () {
            Route::post('/policies', [PolicyController::class, 'store'])->name('compliance.policies.store');
            Route::patch('/policies/{id}', [PolicyController::class, 'update'])->name('compliance.policies.update');
            Route::post('/policies/{id}/publish', [PolicyController::class, 'publish'])->name('compliance.policies.publish');
        });
        // Acknowledgement is open to any employee with the dedicated permission.
        Route::middleware('permission:compliance.policies.acknowledge')
            ->post('/policies/{id}/acknowledge', [PolicyController::class, 'acknowledge'])->name('compliance.policies.acknowledge');

        // Filings
        Route::middleware('permission:compliance.filings.view')
            ->get('/filings', [FilingController::class, 'index'])->name('compliance.filings.index');
        Route::middleware('permission:compliance.filings.manage')->group(function () {
            Route::post('/filings', [FilingController::class, 'store'])->name('compliance.filings.store');
            Route::patch('/filings/{id}/file', [FilingController::class, 'markFiled'])->name('compliance.filings.file');
        });
    });

    // ── Phase 7: API Integrations (admin management) ────────────────────────

    Route::prefix('integrations')->group(function () {
        Route::middleware('permission:integrations.keys.view')
            ->get('/keys', [ApiKeyController::class, 'index'])->name('integrations.keys.index');
        Route::middleware('permission:integrations.keys.manage')->group(function () {
            Route::post('/keys', [ApiKeyController::class, 'store'])->name('integrations.keys.store');
            Route::delete('/keys/{id}', [ApiKeyController::class, 'destroy'])->name('integrations.keys.destroy');
        });

        Route::middleware('permission:integrations.webhooks.view')->group(function () {
            Route::get('/webhooks', [WebhookController::class, 'index'])->name('integrations.webhooks.index');
            Route::get('/webhooks/{id}', [WebhookController::class, 'show'])->name('integrations.webhooks.show');
        });
        Route::middleware('permission:integrations.webhooks.manage')->group(function () {
            Route::post('/webhooks', [WebhookController::class, 'store'])->name('integrations.webhooks.store');
            Route::delete('/webhooks/{id}', [WebhookController::class, 'destroy'])->name('integrations.webhooks.destroy');
        });

        Route::middleware('permission:integrations.logs.view')
            ->get('/logs', [IntegrationLogController::class, 'index'])->name('integrations.logs.index');
    });
});

// ──────────────────────────────────────────────────────────────────────────
// Phase 7: Inbound integration endpoints (API-key authenticated, NOT session)
// ──────────────────────────────────────────────────────────────────────────

Route::middleware('apikey:attendance:write')
    ->post('/integrations/biometric/events', [BiometricWebhookController::class, 'ingest'])
    ->name('integrations.biometric.ingest');

Route::middleware('apikey:payroll:read')
    ->post('/integrations/accounting/preview', [AccountingWebhookController::class, 'preview'])
    ->name('integrations.accounting.preview');

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
});

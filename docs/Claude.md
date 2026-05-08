# Claude.md — iHRIS AI Development Guide

> **Purpose:** This file is the primary context document for Claude (AI) when developing, debugging, or extending any part of the iHRIS codebase. Read this first before touching any module.

---

## 1. Project Identity

**iHRIS** is a production-grade, standalone Human Resource Information System built for Philippine-based companies. It is NOT a boilerplate — every module is fully spec'd and deliberately implemented.

- **Backend:** Laravel 11 (PHP 8.3) — API at `d:\XAMPP\htdocs\iHRIS\api\`
- **Frontend:** React 19 + TypeScript — SPA at `d:\XAMPP\htdocs\iHRIS\web\`
- **Database:** MySQL 8.x (all UUIDs, all UTC, soft deletes everywhere)
- **API Base:** `http://localhost:8000/api/v1` (dev) / `https://api.yourdomain.com/api/v1` (prod)
- **Frontend URL:** `http://localhost:5173` (dev)

---

## 2. Stack Reference

### Backend (`/api`)
| Layer | Technology | Notes |
|---|---|---|
| Framework | Laravel 11 | PHP 8.3, `declare(strict_types=1)` on every file |
| Auth | Laravel Sanctum | Token-based; prefix `api/v1` |
| Middleware | `permission:`, `role:`, `apikey:` | All route-level guards |
| Monetary values | `DECIMAL(15,4)` | Use `Money::round()` helper — never raw floats |
| Timestamps | UTC everywhere | Display in `Asia/Manila` on frontend |
| IDs | UUID v4 | Never use auto-increment for user-facing entities |
| Soft deletes | All user-facing models | `SoftDeletes` trait always |
| Audit logging | `AuditLogger` service | Call on every mutation |

### Frontend (`/web`)
| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI Components | ShadCN UI |
| State | Zustand (`/web/src/stores/auth.ts`) |
| Data fetching | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Recharts |
| Animations | Framer Motion + GSAP |
| Date handling | Day.js |
| API client | Axios wrapper at `/web/src/lib/api.ts` |
| API types | `/web/src/types/` |

---

## 3. Directory Map

```
iHRIS/
├── api/                            ← Laravel backend
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/  ← All route controllers (namespaced by module)
│   │   │   ├── Middleware/          ← AuthenticateApiKey, EnsurePermission, EnsureRole, SecurityHeaders
│   │   │   ├── Requests/            ← Form request validators
│   │   │   └── Resources/           ← API resource transformers
│   │   ├── Models/                  ← Eloquent models (UUID PKs, soft deletes)
│   │   ├── Services/                ← Business logic (pure, testable)
│   │   │   ├── Payroll/             ← PayrollEngineService, PayrollRunService, Statutory/
│   │   │   ├── Ess/                 ← EssAttendanceService, EssLeaveService, EssProfileService
│   │   │   ├── Recruitment/         ← RecruitmentService
│   │   │   ├── Performance/         ← PerformanceService
│   │   │   ├── Assets/              ← AssetService
│   │   │   ├── Compliance/          ← ComplianceService
│   │   │   ├── Integrations/        ← ApiKeyService, WebhookService
│   │   │   ├── Reports/             ← ReportService
│   │   │   └── Audit/               ← AuditLogger
│   │   └── Support/                 ← ApiResponse helper, Money helper
│   ├── database/
│   │   ├── migrations/              ← All migrations (date-prefixed, never modify after deploy)
│   │   └── seeders/                 ← PermissionSeeder, RoleSeeder, etc.
│   ├── routes/api.php               ← ALL routes; versioned under /api/v1
│   └── config/                      ← app, cors, database, sanctum, etc.
│
├── web/                             ← React frontend
│   └── src/
│       ├── api/                     ← Axios API call functions (per module: hr.ts, payroll.ts, etc.)
│       ├── components/              ← Shared UI components
│       ├── hooks/                   ← React Query hooks
│       ├── layouts/                 ← App shell, sidebar, ESS layout
│       ├── pages/                   ← Page components (per module directory)
│       ├── routes/                  ← React Router configuration
│       ├── stores/                  ← Zustand stores (auth.ts)
│       └── types/                   ← TypeScript types (mirrors backend resources)
│
└── docs/                            ← This documentation
```

---

## 4. Module Overview

| Module | Status | Backend Service | Frontend Pages |
|---|---|---|---|
| Auth + MFA | ✅ Complete | `AuthController`, `MfaController` | `pages/auth/` |
| User Management | ✅ Complete | `UserService` | `pages/users/` |
| RBAC | ✅ Complete | `RoleController`, `EnsurePermission` | `pages/users/` |
| Employee Management | ✅ Complete | `EmployeeService` | `pages/employees/` |
| Departments & Positions | ✅ Complete | `DepartmentService`, `PositionService` | `pages/organization/` |
| Org Chart | ✅ Complete | `OrgChartController` | `pages/org-chart/` |
| Documents | ✅ Complete | `DocumentService` | `pages/employees/` |
| Onboarding | ✅ Complete | `OnboardingController` | `pages/onboarding/` |
| HR Tickets | ✅ Complete | `TicketController` | `pages/tickets/` |
| Audit Logs | ✅ Complete | `AuditLogger` | `pages/audit-logs/` |
| Payroll | ✅ Complete | `PayrollEngineService`, `PayrollRunService` | `pages/payroll/` |
| ESS Portal | ✅ Complete | `EssAttendanceService`, `EssLeaveService`, `EssProfileService` | `pages/ess/` |
| Attendance (ESS) | ✅ Complete | `EssAttendanceService` | `pages/attendance/` |
| Leave Management | ✅ Complete | `EssLeaveService` | `pages/leaves/` |
| Recruitment & ATS | ✅ Complete | `RecruitmentService` | `pages/recruitment/` |
| Performance Management | ✅ Complete | `ReviewController`, `GoalController` | `pages/performance/` |
| Reports & Analytics | ✅ Complete | `ReportsController` | `pages/reports/` |
| Asset Management | ✅ Complete | `AssetController` | `pages/assets/` |
| Compliance | ✅ Complete | `PolicyController`, `FilingController` | `pages/compliance/` |
| API Integrations | ✅ Complete | `ApiKeyController`, `WebhookController` | `pages/integrations/` |

---

## 5. Permission System

All route middleware follows this pattern:
```
Route::middleware('permission:module.feature.action')
```

**Permission key format:** `{module}.{feature}.{action}`

Examples:
- `hr.employees.view` — view employee list
- `payroll.runs.finalize` — finalize a payroll run
- `ess.self.access` — base ESS access (assigned to Employee role)

**Checking in frontend:**
```ts
const { hasPermission } = useAuthStore();
if (hasPermission('payroll.runs.finalize')) { ... }
```

**Checking in backend (controller):**
```php
$user->hasPermission('payroll', 'runs', 'finalize')
```

---

## 6. API Response Format (JSend)

All API responses use JSend envelope:

```json
// Success
{ "status": "success", "data": { ... } }

// Validation error
{ "status": "fail", "data": { "field": ["message"] } }

// Server error
{ "status": "error", "message": "Something went wrong." }
```

Use `ApiResponse::success()`, `ApiResponse::fail()`, `ApiResponse::error()` — never raw `response()->json()`.

---

## 7. Money & Arithmetic Rules

**Never** compute money with raw PHP floats. Always use `Money::round()`:

```php
use App\Services\Payroll\Money;

$result = Money::round($hourlyRate * 1.25);  // OT rate
```

All DB monetary columns are `DECIMAL(15, 4)`. Cast them with `Money::toFloat()` before arithmetic.

---

## 8. Audit Logging

Every mutation must be logged. Use `AuditLogger`:

```php
$this->audit->log(
    'employee.updated',
    target: $employee,
    before: $before,
    after: $employee->toArray(),
    actor: $request->user(),
);
```

The `audit_logs` table has DB-level UPDATE and DELETE triggers — it is physically append-only.

---

## 9. Common Patterns

### Controller pattern:
```php
// Inject service via constructor, call service method, return ApiResponse
public function store(StoreEmployeeRequest $request): JsonResponse
{
    $employee = $this->service->create($request->validated(), $request->user());
    return ApiResponse::success(['employee' => new EmployeeResource($employee)], 201);
}
```

### Service pattern:
```php
// Pure computation — no HTTP concerns, no $request objects
// Returns Eloquent models or plain arrays
// Wraps DB mutations in DB::transaction()
// Always logs to AuditLogger on mutations
```

### Frontend API call pattern:
```ts
// api/payroll.ts
export const payrollRunApi = {
  generate: (id: string, data: GenerateInput): Promise<{ run: PayrollRun }> =>
    unwrap(api.post<JSendEnvelope<{ run: PayrollRun }>>(`/payroll/runs/${id}/generate`, data)),
};

// In component (React Query)
const { mutate } = useMutation({ mutationFn: payrollRunApi.generate });
```

---

## 10. What Must Never Change Without Careful Thought

1. **`audit_logs` table** — DB triggers enforce append-only. Never add UPDATE/DELETE to this table.
2. **`payslips` / `payslip_items`** — Once a run is `finalized`, these records are immutable. Corrections happen in the next period.
3. **UUID PKs** — Never switch any table to auto-increment.
4. **`pay_frequency` enum values** — The BIR tax calculator and payslip period factor depend on these exact strings: `monthly`, `semi_monthly`, `weekly`, `bi_weekly`, `daily`.
5. **Statutory tables** (`sss_contribution_brackets`, `philhealth_brackets`, `pagibig_settings`, `bir_tax_brackets`) — These are data-driven (seeded, updateable by HR Admin without code deploy). Never hard-code these values in PHP.
6. **`DECIMAL(15,4)` on all monetary columns** — Never use `FLOAT` or `DOUBLE` for money.

---

## 11. Environment Variables (Key Ones)

```env
# api/.env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ihris
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost

MAIL_MAILER=smtp
QUEUE_CONNECTION=redis  # or database for dev

# web/.env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 12. Running the Dev Stack

```powershell
# Terminal 1 — Laravel API
cd D:\XAMPP\htdocs\iHRIS\api
php artisan serve

# Terminal 2 — React frontend
cd D:\XAMPP\htdocs\iHRIS\web
npm run dev

# Terminal 3 — Queue worker (needed for notifications, reports)
cd D:\XAMPP\htdocs\iHRIS\api
php artisan queue:work

# Run migrations + seeders
php artisan migrate --seed
# Or specific seeders:
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=RoleSeeder
```

---

## 13. File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Controller | `{Noun}Controller.php` | `PayrollRunController.php` |
| Service | `{Noun}Service.php` | `PayrollEngineService.php` |
| Model | `{Noun}.php` (singular) | `Payslip.php` |
| Migration | `{date}_{description}.php` | `2026_05_07_000016_create_payroll_runs_table.php` |
| Request | `{Verb}{Noun}Request.php` | `StoreEmployeeRequest.php` |
| Resource | `{Noun}Resource.php` | `EmployeeResource.php` |
| Frontend API | `{module}.ts` | `payroll.ts` |
| Frontend Page | `{Module}Page.tsx` or directory | `pages/payroll/` |

---

## 14. Testing

- Tests live at `api/tests/Feature/` and `api/tests/Unit/`
- Payroll engine tests are unit tests — `PayrollEngineService` is pure computation
- Run tests: `cd api && php artisan test`
- Use `RefreshDatabase` trait on feature tests
- Use database factories for test data

---

## 15. Inter-Module Dependencies

```
Auth ──────────────────────┐
                           ▼
RBAC ──────────────────► Users ──────────────────► Employees
                                                      │
                    ┌─────┴─────────────────┐
                    ▼                       ▼
               Attendance               Leave Mgmt
                    │                       │
                    └──────────┬────────────┘
                               ▼
                          Payroll Engine
                    (consumes attendance hours + leave days)
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
               Payslips            Compliance Reports
                                   (SSS/PhilHealth/Pag-IBIG/BIR)
```

**Key dependency:** The Payroll Engine (`PayrollEngineService`) consumes:
- Employee `basic_salary` and `pay_frequency`
- `PayrollInputs` struct (hours, absences, allowances — sourced from attendance logs or manual entry)
- Statutory tables from the database (SSS, PhilHealth, Pag-IBIG, BIR brackets)
- Active loans (for amortization deductions via `LoanService`)

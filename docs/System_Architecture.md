# System Architecture — iHRIS

> **Version:** 1.0 · **Stack:** React 19 + TypeScript / Laravel 11 / MySQL 8.x  
> **Environment:** VPS Ubuntu 24 LTS · Nginx · PHP-FPM · Redis · Supervisor

---

## 1. High-Level Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                                         │
│                                                                              │
│  Browser / PWA                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  React 19 SPA (Vite · TypeScript · Tailwind v4 · ShadCN)              │  │
│  │  State: Zustand · Data: TanStack Query · Forms: RHF+Zod               │  │
│  │  Auth: Bearer token (stored in localStorage via tokenStorage)         │  │
│  └────────────────────────────┬───────────────────────────────────────────┘  │
└───────────────────────────────┼──────────────────────────────────────────────┘
                                │ HTTPS REST API (JSON / JSend)
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY TIER (Nginx)                           │
│                                                                              │
│  • TLS termination (Let's Encrypt)                                           │
│  • Static file serving for SPA (dist/)                                       │
│  • Proxy /api/* → PHP-FPM (Laravel)                                          │
│  • Rate limiting (nginx limit_req_zone)                                      │
│  • Security headers (X-Frame-Options, HSTS, etc.)                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION TIER (Laravel 11)                        │
│                                                                              │
│  API Routes (api/v1/*)                                                       │
│  │                                                                           │
│  ▼                                                                           │
│  Middleware Stack                                                             │
│  ├── SecurityHeaders (every response)                                        │
│  ├── auth:sanctum (session auth)                                             │
│  ├── permission:{module}.{feature}.{action}                                  │
│  ├── apikey:{scope} (for external integrations)                              │
│  └── throttleApi (IP-based rate limiting)                                    │
│  │                                                                           │
│  ▼                                                                           │
│  Controllers (Api/V1/{Module}/)                                              │
│  │                                                                           │
│  ▼                                                                           │
│  Services (Business Logic)                                                   │
│  ├── PayrollEngineService  ← Pure computation, no I/O                       │
│  ├── PayrollRunService     ← Orchestrates engine + persistence               │
│  ├── EssAttendanceService  ← Clock-in/out, corrections                      │
│  ├── EssLeaveService       ← Leave filing, balance management               │
│  ├── EssProfileService     ← Profile change requests                        │
│  ├── RecruitmentService    ← ATS pipeline                                   │
│  ├── PerformanceService    ← Reviews, goals, cycles                         │
│  ├── AuditLogger           ← Append-only audit trail                        │
│  └── ...other services                                                       │
│  │                                                                           │
│  ▼                                                                           │
│  Eloquent Models / Query Builder                                              │
│  │                                                                           │
│  ├───────────────────────────────────────────────────────────────────────   │
│  ▼                           ▼                        ▼                      │
│  MySQL 8.x               Redis Cache              Redis Queue                │
│  (Primary store)         (Permission cache,       (Notifications,            │
│                           Session, Rate limit)     Reports, Emails,          │
│                                                    Payslip PDFs)             │
└──────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      WORKER TIER (Supervisor)                                │
│                                                                              │
│  php artisan queue:work --queue=notifications,reports,default                │
│  • Email delivery (Laravel Mailable)                                         │
│  • SMS (Semaphore / Vonage)                                                  │
│  • Push notifications (PWA service worker)                                   │
│  • Payslip PDF generation (Blade templates → DomPDF)                         │
│  • Report exports (Excel / PDF / CSV)                                        │
│  • Webhook outbound delivery (with retry)                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SCHEDULER (cron + Laravel Scheduler)                      │
│                                                                              │
│  * * * * * php artisan schedule:run                                          │
│  • Document expiry reminders (daily)                                         │
│  • Leave carry-over processing (yearly)                                      │
│  • Regulatory filing deadline alerts (daily)                                 │
│  • Performance review due-date reminders (daily)                             │
│  • Asset warranty expiry alerts (weekly)                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Request Lifecycle

### Authenticated HR Request (example: view employee list)

```
1. Browser → GET /api/v1/employees
             Authorization: Bearer {sanctum_token}

2. Nginx
   └── proxy_pass to PHP-FPM

3. Laravel bootstrap/app.php
   └── apiPrefix: 'api/v1'

4. Middleware chain:
   ├── SecurityHeaders::handle()    → sets X-Content-Type-Options etc.
   ├── auth:sanctum                 → resolves user from token, 401 if invalid
   └── permission:hr.employees.view → checks user→roles→permissions, 403 if denied

5. EmployeeController::index()
   └── EmployeeService::paginate($filters)
       └── Employee::query()->filter()->with(['department', 'position'])->paginate()

6. EmployeeResource collection → JSON

7. ApiResponse::success(['employees' => $resource, 'meta' => $paginator])
   → {"status": "success", "data": {"employees": [...], "meta": {...}}}

8. Response travels back through SecurityHeaders (headers already set)
```

### ESS Clock-In Request

```
1. Browser → POST /api/v1/ess/attendance/clock-in
             Authorization: Bearer {token}
             Body: {lat, lng, location_type}

2. Middleware:
   ├── auth:sanctum
   └── permission:ess.self.access

3. EssAttendanceController::clockIn()
   └── resolves $employee = $request->user()->employee (throws 403 if no employee)
   └── EssAttendanceService::clockIn($employee, Carbon::now('UTC'), $meta)
       ├── AttendanceLog::updateOrCreate([employee_id, work_date], {...})
       └── AuditLogger::log('attendance.clock_in', ...)
```

---

## 3. Module Architecture

Each module follows this layered structure:

```
Route (api.php)
  └── Middleware (permission:xxx)
      └── Controller (Api/V1/{Module}/{Noun}Controller.php)
          └── FormRequest (Http/Requests/{Module}/{Verb}{Noun}Request.php)
          └── Service (Services/{Module}/{Noun}Service.php)
              └── Model (Models/{Noun}.php)
              └── AuditLogger
          └── Resource (Http/Resources/{Noun}Resource.php)
          └── ApiResponse::success(...)
```

### Module-to-Service Map

| Module | Controller Namespace | Service(s) |
|---|---|---|
| Auth | `Auth\AuthController` | inline in controller |
| MFA | `Auth\MfaController` | inline |
| Users | `User\UserController` | `UserService` |
| Employees | `Employee\EmployeeController` | `EmployeeService` |
| Departments | `Organization\DepartmentController` | `DepartmentService` |
| Positions | `Organization\PositionController` | `PositionService` |
| Org Chart | `Organization\OrgChartController` | inline |
| Documents | `Employee\DocumentController` | `DocumentService` |
| Onboarding | `Onboarding\OnboardingController` | inline |
| Tickets | `Tickets\TicketController` | inline |
| RBAC | `Admin\RoleController` | inline |
| Audit Logs | `Admin\AuditLogController` | inline |
| Payroll Periods | `Payroll\PayrollPeriodController` | `PayrollPeriodService` |
| Payroll Runs | `Payroll\PayrollRunController` | `PayrollRunService` |
| Payslips | `Payroll\PayslipController` | `PayrollRunService` |
| Loans | `Payroll\LoanController` | `LoanService` |
| 13th Month | `Payroll\ThirteenthMonthController` | `ThirteenthMonthService` |
| Final Pay | `Payroll\FinalPayController` | `FinalPayService` |
| Compliance Reports | `Payroll\ComplianceReportController` | `ComplianceReportService` |
| ESS Attendance | `Ess\EssAttendanceController` | `EssAttendanceService` |
| ESS Leave | `Ess\EssLeaveController` | `EssLeaveService` |
| ESS Profile | `Ess\EssProfileController` | `EssProfileService` |
| Recruitment | `Recruitment\*Controller` | `RecruitmentService` |
| Performance | `Performance\*Controller` | inline per controller |
| Reports | `Reports\ReportsController` | `ReportService` |
| Assets | `Assets\AssetController` | `AssetService` |
| Compliance | `Compliance\PolicyController`, `FilingController` | inline |
| API Keys | `Integrations\ApiKeyController` | `ApiKeyService` |
| Webhooks | `Integrations\WebhookController` | inline |
| Biometric (inbound) | `Integrations\BiometricWebhookController` | inline |
| Accounting (inbound) | `Integrations\AccountingWebhookController` | inline |

---

## 4. Authentication & Authorization Architecture

### Token Flow

```
Login → POST /api/v1/auth/login
        ├── Validate credentials
        ├── Check failed_login_attempts → lock if ≥ 5
        ├── If mfa_enabled → return {requires_mfa: true, challenge_token}
        └── Else → create Sanctum token → return {token, user, permissions}

MFA Challenge → POST /api/v1/auth/mfa/verify
        ├── Validate TOTP code against mfa_secret (TOTP RFC 6238)
        └── Return full Sanctum token

Token Usage → Every request sends: Authorization: Bearer {token}
        └── Sanctum middleware resolves user from personal_access_tokens
```

### RBAC Architecture

```
User
 └── has many Roles (via user_roles pivot)
      └── each Role has many Permissions (via role_permissions pivot)
           └── Permission: {module}.{feature}.{action}

user->hasPermission('payroll', 'runs', 'finalize')
  └── Checks Redis cache (key: "user:{id}:permissions")
  └── If cache miss → queries user_roles → role_permissions → permissions
  └── Caches flat permission array for subsequent requests
  └── Cache invalidated on role change
```

---

## 5. Payroll Engine Architecture

The payroll engine is intentionally separated into layers:

```
PayrollRunController
  └── PayrollRunService::generatePayslips()
      ├── Resolves in-scope employees
      ├── For each employee:
      │   ├── PayrollInputs (hours, absences, allowances — caller-provided)
      │   ├── PayrollEngineService::computeForEmployee() ← PURE FUNCTION
      │   │   ├── RateCalculator::fromEmployee() → {hourly, daily, monthly}
      │   │   ├── Compute earnings (basic, OT, holiday, night diff, allowances)
      │   │   ├── Compute statutory deductions:
      │   │   │   ├── SssCalculator::compute(monthly_compensation)
      │   │   │   ├── PhilhealthCalculator::compute(monthly_basic)
      │   │   │   ├── PagibigCalculator::compute(monthly_compensation)
      │   │   │   └── BirTaxCalculator::compute(period_taxable_income, pay_frequency)
      │   │   └── Return {summary, items[], snapshot}
      │   ├── LoanService::getActiveLoansForPeriod($employee) → deductions
      │   └── Persist: Payslip + PayslipItems + LoanPayments
      └── Update PayrollRun roll-up totals
```

**Key design principle:** `PayrollEngineService` has zero database writes — it only reads statutory tables and returns arrays. `PayrollRunService` handles all persistence. This makes the engine fully unit-testable.

---

## 6. Frontend Architecture

```
web/src/
├── main.tsx              → React root, TanStack Query provider, Zustand
├── App.tsx               → Router + layout switching
├── routes/               → React Router v6 route definitions
│   └── index.tsx         → Protected routes, role guards
├── layouts/
│   ├── AppLayout.tsx     → Main admin shell (sidebar + header)
│   └── EssLayout.tsx     → Employee self-service shell
├── pages/                → One directory per module
│   ├── auth/             → Login, forgot password, MFA
│   ├── dashboard/        → Role-based dashboard
│   ├── employees/        → Employee CRUD + documents
│   ├── payroll/          → Periods, runs, payslips, loans
│   ├── ess/              → ESS portal (attendance, leave, profile)
│   ├── recruitment/      → ATS pipeline pages
│   ├── performance/      → Review cycles, goals, reviews
│   └── ...               → Other modules
├── components/           → Shared reusable components
├── api/                  → Axios-based API call functions (per module)
│   ├── hr.ts             → Employee, department, position APIs
│   ├── payroll.ts        → Payroll periods, runs, payslips, loans
│   ├── ess.ts            → ESS attendance, leave, profile
│   └── ...
├── hooks/                → React Query hooks wrapping api/ functions
├── stores/
│   └── auth.ts           → Zustand auth store (user, token, permissions)
├── types/                → TypeScript interfaces (mirrors Laravel resources)
└── lib/
    └── api.ts            → Axios instance + interceptors + tokenStorage
```

### Data Flow (Frontend)

```
User interaction
  → React component
    → useQuery / useMutation (TanStack Query)
      → api/{module}.ts function
        → axios (lib/api.ts)
          → adds Authorization: Bearer token
          → hits /api/v1/{endpoint}
        ← JSend JSON response
      ← unwrap() extracts .data
    ← React Query caches + returns
  ← Component re-renders
```

---

## 7. Integration Architecture

### Inbound (External systems → iHRIS)

| Source | Endpoint | Auth | Notes |
|---|---|---|---|
| Biometric device | `POST /api/v1/integrations/biometric/events` | `X-Api-Key` with `attendance:write` scope | Ingests raw clock events |
| Accounting system | `POST /api/v1/integrations/accounting/preview` | `X-Api-Key` with `payroll:read` scope | Preview payroll totals |

**API Key authentication flow:**
1. External system sends `X-Api-Key: {raw_key}` header
2. `AuthenticateApiKey` middleware computes `SHA-256(raw_key)`
3. Looks up matching `key_hash` in `api_keys` table
4. Checks scopes, rate limits
5. Every request logged to `integration_logs`

### Outbound (iHRIS → External systems)

Webhook subscriptions in `webhook_subscriptions` table trigger on events like:
- `payroll.run.finalized`
- `leave.approved`
- `employee.created`

Delivery is queued, signed with HMAC-SHA256, retried up to `max_retries` times, logged in `webhook_deliveries`.

---

## 8. Queue Architecture

### Queue Channels

| Queue | Purpose |
|---|---|
| `notifications` | High priority: email, SMS, push |
| `reports` | Async report generation (Excel, PDF exports) |
| `default` | Payslip PDFs, webhook delivery, other async tasks |

### Supervisor Config (Production)

```ini
[program:ihris-worker]
command=php /var/www/ihris/api/artisan queue:work redis --queue=notifications,reports,default --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/ihris/worker.log
```

---

## 9. Caching Strategy

| Data | Cache Key | TTL | Invalidation |
|---|---|---|---|
| User permissions | `user:{id}:permissions` | 60 min | On role assignment change |
| API key resolution | `apikey:{hash_prefix}` | 5 min | On key revocation |
| SSS/PhilHealth/BIR brackets | `statutory:{type}:{year}` | 24 hr | On statutory table update |
| Session | `sessions` table + Redis | configurable | On logout |
| Rate limiting | `apikey:{id}` per minute | 60 sec | Sliding window |

---

## 10. Error Handling

All errors are normalized through `ApiResponse` in `bootstrap/app.php`:

| Exception Type | HTTP Status | Response Format |
|---|---|---|
| `ValidationException` | 422 | `{status: "fail", data: {field: ["error"]}}` |
| `AuthenticationException` | 401 | `{status: "error", message: "Unauthenticated."}` |
| `HttpException` (4xx) | varies | `{status: "fail", data: {message: "..."}}` |
| `HttpException` (5xx) | varies | `{status: "error", message: "..."}` |
| Any unhandled | 500 | `{status: "error", message: "Server Error"}` |

---

## 11. File Storage

| Purpose | Dev | Prod |
|---|---|---|
| Employee documents | `storage/app/documents/` | S3 / compatible |
| Avatars/profile images | `storage/app/avatars/` | S3 |
| Resumes (applicants) | `storage/app/resumes/` | S3 + virus scan |
| Payslip PDFs | `storage/app/payslips/` | S3 |
| Generated reports | `storage/app/exports/` | S3 (temp, 24-hr TTL) |

Files are served via signed URLs (time-limited). Never expose raw storage paths in API responses.

---

## 12. Scalability Notes

The architecture supports horizontal scaling on the application tier:

- **Sessions:** Database-backed or Redis (not file-based) — safe for multi-instance
- **Queue:** Redis — safe for multi-worker
- **Cache:** Redis — safe for multi-instance
- **File storage:** S3-compatible — shared across all instances
- **Database:** MySQL with connection pooling (PgBouncer optional for high load)
- The payroll engine is stateless — can be extracted to a dedicated microservice if needed

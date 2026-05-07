# iHRIS — Human Resource Information System

> Standalone, PH-compliant HRIS. **Phase 0 foundation**: Auth, RBAC, audit log
> infrastructure, and a role-aware dashboard shell.

See [HRIS_MASTER.md](./HRIS_MASTER.md) for the full PRD, module specs, roadmap,
and Claude Code master prompt.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Laravel 11 · PHP 8.2+ · MySQL/MariaDB (XAMPP) · Sanctum tokens |
| Frontend | React 19 · TypeScript · Vite 8 · Tailwind v4 · TanStack Query · Zustand · Framer Motion |
| Design | ui-ux-pro-max (Trust & Authority style · cyan #0891B2 · Inter) |
| Animation | Emil Kowalski's design-engineering principles |

## Project layout

```
iHRIS/
├── HRIS_MASTER.md             # Full PRD + roadmap (read this first)
├── api/                       # Laravel 11 backend
├── web/                       # React + TS frontend
├── design-system/ihris/       # Persisted design system (MASTER.md + page overrides)
├── .agents/skills/            # Claude Code skills (emil-design-eng, etc.)
└── .github/prompts/           # ui-ux-pro-max workflow
```

---

## Local setup

### Prerequisites

- XAMPP (PHP 8.2+ and MySQL/MariaDB) running with **MySQL on port 3306**
- Node.js 20+ and npm
- Composer 2+

### 1. Backend (`api/`)

```powershell
# From d:\XAMPP\htdocs\iHRIS
cd api
composer install                            # if cloning fresh; already done locally

# Database (XAMPP MySQL must be running)
"d:\XAMPP\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS ihris CHARACTER SET utf8mb4;"

# Migrate + seed (creates super admin)
php artisan migrate:fresh --seed

# Start the API
php artisan serve --port=8000
```

### 2. Frontend (`web/`)

```powershell
cd web
npm install                                 # already done locally
npm run dev                                 # → http://localhost:5173
```

### 3. Sign in

Open [http://localhost:5173](http://localhost:5173) and sign in with the seeded
super admin account:

| | |
|---|---|
| **Email** | `admin@ihris.local` |
| **Password** | `ChangeMe!Now123` |

> Override these by editing `api/.env` (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`)
> and re-running `php artisan db:seed`.

---

## What's wired in Phase 0

### Backend

- **Auth** — `POST /api/v1/auth/login`, `/logout`, `/forgot-password`,
  `/reset-password`, `GET /auth/me`. Rate-limited (5 attempts / minute / email+IP).
  MFA challenge token issued when `mfa_enabled` is true (verification endpoint
  to be added in Phase 1).
- **JSend response envelope** (`App\Support\ApiResponse`) — every endpoint returns
  `{ status, data }` per the PRD spec.
- **RBAC** — `permission` and `role` middleware aliases. Permission key format:
  `module.feature.action` (e.g. `hr.employees.view`). Enforced server-side; the
  React store mirrors it for UI gating.
- **Audit log** — append-only `audit_logs` table protected by DB triggers
  (`audit_logs_no_update`, `audit_logs_no_delete`). Every mutation writes through
  `App\Services\Audit\AuditLogger`. Logins, logouts, failed logins, password
  resets, and password reset requests are already logged.
- **Schema strategy** — UUID primary keys everywhere; soft deletes on user-facing
  entities; government IDs (SSS, PhilHealth, Pag-IBIG, TIN) encrypted at rest;
  monetary fields stored as `DECIMAL(15, 4)` per the PRD.

### Default roles + permissions

| Role | Hierarchy | Permission scope |
|---|---|---|
| `super_admin` | 1 | All permissions |
| `hr_admin` | 10 | HR + payroll + attendance + leaves + ESS + user management |
| `manager` | 50 | View team data + approve leave/attendance |
| `employee` | 100 | ESS + own payslips + own leave requests |

The seeded permission catalog covers Phase 0–4 modules. New permissions are added
to `database/seeders/PermissionSeeder.php` and re-seeded idempotently.

### Frontend

- **Bootstrap auth** — `useBootstrapAuth` hits `/auth/me` on app load when a
  token is present, then hydrates the Zustand store. Stale tokens are cleared.
- **Route guards** — `RequireAuth`, `RedirectIfAuthed`, `RequirePermission`.
  Sidebar nav items are filtered by permission.
- **Pages** — Login, Forgot Password, Dashboard. Other module routes (Employees,
  Organization, Attendance, Leaves, Payroll, Audit Logs, Reports) render
  permission-gated placeholders that swap in real implementations as each phase
  ships.
- **Design system** — Tailwind v4 `@theme` tokens for brand/CTA/surface colors,
  Emil-style cubic-bezier easings, and Inter as the typeface (per the
  ui-ux-pro-max output in [`design-system/ihris/MASTER.md`](./design-system/ihris/MASTER.md)).
- **Animation conventions** — UI animations stay under 300ms; `easeOutStrong`
  ((0.23, 1, 0.32, 1)) by default; `pressable` utility applies `scale(0.97)` on
  `:active`; cards stagger in at 60ms intervals.

---

## Adding a new module

The PRD's "When building a module" checklist applies. Roughly:

1. Migration → Model (use `HasUuid` + `SoftDeletes` traits)
2. Repository → Service → Controller (thin) → Form Request → API Resource
3. Route in `routes/api.php` under `auth:sanctum` + `permission:module.feature.action`
4. Add new permissions to `PermissionSeeder` and re-run `php artisan db:seed --class=PermissionSeeder`
5. Mutations write to `audit_logs` via `AuditLogger`
6. Frontend: types in `src/types/`, API in `src/api/`, hooks in `src/hooks/`,
   page in `src/pages/{module}/`, register the route in `App.tsx` with
   `RequirePermission`

---

## Useful commands

```powershell
# Backend
cd api
php artisan migrate:fresh --seed     # rebuild DB (destructive)
php artisan db:seed --class=PermissionSeeder
php artisan tinker                   # REPL

# Frontend
cd web
npm run dev                          # http://localhost:5173
npm run build                        # production build
npx tsc --noEmit -p tsconfig.app.json  # typecheck only
```

---

## Roadmap

Phase 0 (this scaffold) is complete. Next phases per [HRIS_MASTER.md §5](./HRIS_MASTER.md#5-development-roadmap):

- **Phase 1 — Core HR**: Employee Management, User Management, Departments,
  Org Chart, Documents, Onboarding, Helpdesk
- **Phase 2 — Time & Attendance**: Shift scheduling, time logs, OT detection
- **Phase 3 — Leave Management**
- **Phase 4 — Payroll** (PH-compliant: SSS, PhilHealth, Pag-IBIG, BIR, 13th month)
- **Phase 5 — ESS Portal**
- **Phase 6 — Recruitment & Performance**
- **Phase 7 — Reports, Integrations, Hardening**

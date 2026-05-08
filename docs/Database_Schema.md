# Database Schema — iHRIS

> **Database:** MySQL 8.x  
> **Conventions:** UUID PKs everywhere · `DECIMAL(15,4)` for money · UTC timestamps · Soft deletes on all user-facing entities · `created_at` / `updated_at` / `deleted_at` on every table

---

## Table of Contents

1. [Core & Auth Tables](#1-core--auth-tables)
2. [Organization Tables](#2-organization-tables)
3. [Employee Tables](#3-employee-tables)
4. [Attendance Tables](#4-attendance-tables)
5. [Leave Tables](#5-leave-tables)
6. [Payroll Tables](#6-payroll-tables)
7. [Recruitment Tables](#7-recruitment-tables)
8. [Performance Tables](#8-performance-tables)
9. [Asset Management Tables](#9-asset-management-tables)
10. [Compliance Tables](#10-compliance-tables)
11. [Integration Tables](#11-integration-tables)
12. [System Tables](#12-system-tables)
13. [Entity Relationship Summary](#13-entity-relationship-summary)

---

## 1. Core & Auth Tables

### `users`
Primary account record. One user can optionally be linked to one employee record.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `employee_id` | `VARCHAR` nullable unique | Foreign reference string (not FK) |
| `first_name` | `VARCHAR` | |
| `middle_name` | `VARCHAR` nullable | |
| `last_name` | `VARCHAR` | |
| `email` | `VARCHAR` unique | |
| `email_verified_at` | `TIMESTAMP` nullable | |
| `password` | `VARCHAR` | bcrypt, cost factor 12 |
| `avatar_path` | `VARCHAR` nullable | S3/local storage path |
| `phone` | `VARCHAR` nullable | |
| `status` | `ENUM(active, inactive, suspended)` | default: `active` |
| `last_login_at` | `TIMESTAMP` nullable | |
| `last_login_ip` | `VARCHAR(45)` nullable | IPv4 or IPv6 |
| `mfa_enabled` | `BOOLEAN` | default: `false` |
| `mfa_secret` | `TEXT` nullable | Encrypted TOTP secret |
| `mfa_recovery_codes` | `JSON` nullable | Hashed recovery codes |
| `failed_login_attempts` | `INT` | default: `0` |
| `locked_until` | `TIMESTAMP` nullable | Account lockout expiry |
| `remember_token` | `VARCHAR` nullable | |
| `created_at` / `updated_at` | `TIMESTAMP` | |
| `deleted_at` | `TIMESTAMP` nullable | Soft delete |

**Indexes:** `status`, `email_verified_at`

---

### `password_reset_tokens`

| Column | Type |
|---|---|
| `email` | `VARCHAR` PK |
| `token` | `VARCHAR` |
| `created_at` | `TIMESTAMP` nullable |

---

### `sessions`

| Column | Type |
|---|---|
| `id` | `VARCHAR` PK |
| `user_id` | `UUID` nullable (indexed) |
| `ip_address` | `VARCHAR(45)` nullable |
| `user_agent` | `TEXT` nullable |
| `payload` | `LONGTEXT` |
| `last_activity` | `INT` (indexed) |

---

### `roles`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `name` | `VARCHAR` unique | e.g. `super_admin`, `hr_admin` |
| `display_name` | `VARCHAR` | |
| `description` | `TEXT` nullable | |
| `hierarchy_level` | `INT` | Lower = higher privilege; default: `100` |
| `is_system` | `BOOLEAN` | System roles cannot be deleted |
| `created_at` / `updated_at` | `TIMESTAMP` | |
| `deleted_at` | `TIMESTAMP` nullable | |

**Indexes:** `hierarchy_level`

---

### `permissions`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `module` | `VARCHAR` | e.g. `hr`, `payroll`, `ess` |
| `feature` | `VARCHAR` | e.g. `employees`, `runs` |
| `action` | `VARCHAR` | e.g. `view`, `create`, `edit`, `delete`, `export` |
| `display_name` | `VARCHAR` | |
| `description` | `TEXT` nullable | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

**Unique:** `(module, feature, action)` · **Index:** `module`

---

### `role_permissions` (pivot)

| Column | Type |
|---|---|
| `role_id` | `UUID` FK → `roles.id` (cascade) |
| `permission_id` | `UUID` FK → `permissions.id` (cascade) |
| `created_at` / `updated_at` | `TIMESTAMP` |

**PK:** `(role_id, permission_id)`

---

### `user_roles` (pivot)

| Column | Type |
|---|---|
| `user_id` | `UUID` FK → `users.id` (cascade) |
| `role_id` | `UUID` FK → `roles.id` (cascade) |
| `assigned_by` | `UUID` FK → `users.id` nullable |
| `created_at` / `updated_at` | `TIMESTAMP` |

**PK:** `(user_id, role_id)`

---

### `audit_logs`
Append-only. **DB-level UPDATE and DELETE triggers prevent any modifications.**

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `actor_id` | `UUID` nullable | The user who performed the action |
| `actor_email` | `VARCHAR` nullable | Snapshot of email at time of action |
| `action` | `VARCHAR` | e.g. `employee.updated`, `payroll.run.finalized` |
| `target_type` | `VARCHAR` nullable | Model class name |
| `target_id` | `VARCHAR` nullable | Model UUID |
| `before` | `JSON` nullable | State before mutation |
| `after` | `JSON` nullable | State after mutation |
| `ip_address` | `VARCHAR(45)` nullable | |
| `user_agent` | `TEXT` nullable | |
| `metadata` | `JSON` nullable | Extra context |
| `created_at` | `TIMESTAMP` | `useCurrent()` — no `updated_at` |

**Indexes:** `actor_id`, `action`, `(target_type, target_id)`, `created_at`

---

## 2. Organization Tables

### `departments`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `code` | `VARCHAR` unique | e.g. `ENG`, `HR`, `FIN` |
| `name` | `VARCHAR` | |
| `description` | `TEXT` nullable | |
| `parent_id` | `UUID` nullable FK → `departments.id` | Self-referential hierarchy |
| `head_user_id` | `UUID` nullable FK → `users.id` | |
| `is_active` | `BOOLEAN` | default: `true` |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

**Indexes:** `parent_id`, `is_active`

---

### `positions`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `department_id` | `UUID` nullable FK → `departments.id` | |
| `code` | `VARCHAR` unique | e.g. `ENG-SR`, `HR-MGR` |
| `title` | `VARCHAR` | |
| `description` | `TEXT` nullable | |
| `salary_min` | `DECIMAL(15,4)` nullable | Added via migration `2026_05_07_000001` |
| `salary_max` | `DECIMAL(15,4)` nullable | |
| `rank_level` | `INT` | default: `1` — higher = senior |
| `is_active` | `BOOLEAN` | default: `true` |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

**Indexes:** `rank_level`

---

## 3. Employee Tables

### `employees`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `user_id` | `UUID` nullable unique FK → `users.id` | Linked system account |
| `employee_number` | `VARCHAR` unique | Format: `EMP-0001` (auto-generated) |
| `department_id` | `UUID` nullable FK → `departments.id` | |
| `position_id` | `UUID` nullable FK → `positions.id` | |
| `reports_to_id` | `UUID` nullable FK → `employees.id` | Self-referential |
| `birth_date` | `DATE` nullable | |
| `gender` | `ENUM(male, female, other, prefer_not_to_say)` nullable | |
| `civil_status` | `ENUM(single, married, widowed, separated, divorced)` nullable | |
| `nationality` | `VARCHAR` | default: `Filipino` |
| `religion` | `VARCHAR` nullable | |
| `address_line_1` | `VARCHAR` nullable | |
| `address_line_2` | `VARCHAR` nullable | |
| `city` | `VARCHAR` nullable | |
| `province` | `VARCHAR` nullable | |
| `postal_code` | `VARCHAR` nullable | |
| `country` | `VARCHAR` | default: `Philippines` |
| `sss_number` | `TEXT` nullable | **Encrypted at rest** |
| `philhealth_number` | `TEXT` nullable | **Encrypted at rest** |
| `pagibig_number` | `TEXT` nullable | **Encrypted at rest** |
| `tin` | `TEXT` nullable | **Encrypted at rest** |
| `employment_status` | `ENUM(regular, probationary, contractual, part_time, project_based, resigned, terminated, on_leave)` | default: `probationary` |
| `date_hired` | `DATE` nullable | |
| `regularization_date` | `DATE` nullable | |
| `separation_date` | `DATE` nullable | |
| `separation_reason` | `VARCHAR` nullable | |
| `basic_salary` | `DECIMAL(15,4)` | Monthly basic; default: `0` |
| `pay_frequency` | `ENUM(monthly, semi_monthly, weekly, daily)` | default: `semi_monthly` |
| `emergency_contact` | `JSON` nullable | `{name, relationship, phone}` |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

**Indexes:** `employment_status`, `date_hired`

---

### `employee_documents`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `employee_id` | `UUID` FK → `employees.id` | |
| `type` | `VARCHAR` | e.g. `contract`, `resume`, `id_copy`, `certificate` |
| `file_name` | `VARCHAR` | Original filename |
| `file_path` | `VARCHAR` | Storage path |
| `file_size` | `BIGINT` nullable | In bytes |
| `mime_type` | `VARCHAR` nullable | |
| `expires_at` | `DATE` nullable | For expiry reminders |
| `uploaded_by` | `UUID` FK → `users.id` | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

---

### `onboarding_checklists`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `name` | `VARCHAR` | |
| `description` | `TEXT` nullable | |
| `is_active` | `BOOLEAN` | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

### `onboarding_tasks`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `checklist_id` | `UUID` FK → `onboarding_checklists.id` | |
| `title` | `VARCHAR` | |
| `description` | `TEXT` nullable | |
| `sort_order` | `INT` | |
| `is_required` | `BOOLEAN` | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

### `onboarding_assignments`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `employee_id` | `UUID` FK → `employees.id` | |
| `checklist_id` | `UUID` FK → `onboarding_checklists.id` | |
| `assigned_by` | `UUID` FK → `users.id` | |
| `due_date` | `DATE` nullable | |
| `status` | `VARCHAR` | `pending`, `in_progress`, `completed` |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

### `onboarding_task_completions`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `assignment_id` | `UUID` FK → `onboarding_assignments.id` |
| `task_id` | `UUID` FK → `onboarding_tasks.id` |
| `completed_by` | `UUID` FK → `users.id` |
| `completed_at` | `TIMESTAMP` |
| `notes` | `TEXT` nullable |

---

### `hr_tickets`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `employee_id` | `UUID` FK → `employees.id` | Requester |
| `category` | `VARCHAR` | e.g. `payroll`, `benefits`, `it`, `facilities` |
| `subject` | `VARCHAR` | |
| `description` | `TEXT` | |
| `status` | `ENUM(open, in_progress, resolved, closed)` | |
| `priority` | `ENUM(low, medium, high, urgent)` | |
| `assigned_to` | `UUID` FK → `users.id` nullable | |
| `resolved_at` | `TIMESTAMP` nullable | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

---

### `hr_ticket_notes`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `ticket_id` | `UUID` FK → `hr_tickets.id` |
| `author_id` | `UUID` FK → `users.id` |
| `body` | `TEXT` |
| `is_internal` | `BOOLEAN` (default: false) |
| `created_at` / `updated_at` | `TIMESTAMP` |

---

### `profile_update_requests`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `employee_id` | `UUID` FK → `employees.id` | |
| `requested_changes` | `JSON` | `{field: {old, new}}` |
| `status` | `VARCHAR` | `pending`, `approved`, `rejected` |
| `reviewed_by` | `UUID` FK → `users.id` nullable | |
| `reviewer_note` | `TEXT` nullable | |
| `reviewed_at` | `TIMESTAMP` nullable | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

## 4. Attendance Tables

### `attendance_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `employee_id` | `UUID` FK → `employees.id` (cascade) | |
| `work_date` | `DATE` | |
| `clock_in_at` | `TIMESTAMP` nullable | UTC |
| `clock_out_at` | `TIMESTAMP` nullable | UTC |
| `clock_in_ip` | `VARCHAR(45)` nullable | |
| `clock_out_ip` | `VARCHAR(45)` nullable | |
| `clock_in_lat` | `DECIMAL(10,7)` nullable | |
| `clock_in_lng` | `DECIMAL(10,7)` nullable | |
| `clock_out_lat` | `DECIMAL(10,7)` nullable | |
| `clock_out_lng` | `DECIMAL(10,7)` nullable | |
| `location_type` | `VARCHAR` | `on_site`, `remote`, `field` |
| `regular_hours` | `DECIMAL(6,2)` | Computed on clock-out |
| `overtime_hours` | `DECIMAL(6,2)` | Hours beyond 8 (pending approval) |
| `late_minutes` | `DECIMAL(6,2)` | |
| `undertime_minutes` | `DECIMAL(6,2)` | |
| `status` | `VARCHAR` | `present`, `late`, `undertime`, `absent`, `on_leave`, `holiday` |
| `is_corrected` | `BOOLEAN` | Set when a correction was applied |
| `source` | `VARCHAR` | `web`, `qr`, `biometric`, `manual` |
| `remarks` | `TEXT` nullable | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

**Unique:** `(employee_id, work_date)` — one log per employee per day

---

### `attendance_correction_requests`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `employee_id` | `UUID` FK → `employees.id` | |
| `attendance_log_id` | `UUID` FK → `attendance_logs.id` nullable | May not exist yet |
| `work_date` | `DATE` | |
| `requested_clock_in` | `TIMESTAMP` nullable | |
| `requested_clock_out` | `TIMESTAMP` nullable | |
| `reason` | `TEXT` | |
| `status` | `VARCHAR` | `pending`, `approved`, `rejected` |
| `reviewed_by` | `UUID` FK → `users.id` nullable | |
| `reviewer_note` | `TEXT` nullable | |
| `reviewed_at` | `TIMESTAMP` nullable | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

## 5. Leave Tables

### `leave_types`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `code` | `VARCHAR(30)` unique | `vl`, `sl`, `emergency`, `maternity`, `paternity`, `solo_parent`, `sil` |
| `name` | `VARCHAR` | |
| `description` | `TEXT` nullable | |
| `default_credits` | `SMALLINT` | `0` = unlimited / non-accruing |
| `requires_attachment` | `BOOLEAN` | e.g. sick leave needs medical cert |
| `is_paid` | `BOOLEAN` | default: `true` |
| `is_active` | `BOOLEAN` | default: `true` |
| `is_system` | `BOOLEAN` | System types cannot be deleted |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

### `leave_balances`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `employee_id` | `UUID` FK → `employees.id` (cascade) | |
| `leave_type_id` | `UUID` FK → `leave_types.id` (cascade) | |
| `year` | `SMALLINT` | Calendar year |
| `credits` | `DECIMAL(7,2)` | Total allocated |
| `used` | `DECIMAL(7,2)` | Approved and consumed |
| `pending` | `DECIMAL(7,2)` | In pending approval |
| `created_at` / `updated_at` | `TIMESTAMP` | |

**Unique:** `(employee_id, leave_type_id, year)`  
**Computed:** `available = credits - used - pending`

---

### `leave_requests`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `employee_id` | `UUID` FK → `employees.id` (cascade) | |
| `leave_type_id` | `UUID` FK → `leave_types.id` | |
| `start_date` | `DATE` | |
| `end_date` | `DATE` | |
| `total_days` | `DECIMAL(5,1)` | Supports half-days (e.g. `0.5`) |
| `reason` | `VARCHAR` | |
| `attachment_path` | `VARCHAR` nullable | For sick leave, etc. |
| `status` | `VARCHAR` | `pending`, `approved`, `rejected`, `cancelled` |
| `current_approver_level` | `TINYINT` | default: `1` |
| `approvals` | `JSON` nullable | `[{level, approver_id, status, note, decided_at}]` |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

---

## 6. Payroll Tables

### `sss_contribution_brackets`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `effective_year` | `SMALLINT` | Year the table applies |
| `msc_min` | `DECIMAL(10,2)` | Monthly salary credit min |
| `msc_max` | `DECIMAL(10,2)` | Monthly salary credit max |
| `employee_share` | `DECIMAL(10,2)` | Fixed peso amount |
| `employer_share` | `DECIMAL(10,2)` | |
| `ec_share` | `DECIMAL(10,2)` | Employer EC contribution |
| `total_contribution` | `DECIMAL(10,2)` | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

**Index:** `(effective_year, msc_min)`

---

### `philhealth_brackets`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `effective_year` | `SMALLINT` | |
| `salary_min` | `DECIMAL(10,2)` | |
| `salary_max` | `DECIMAL(10,2)` nullable | null = top-open |
| `premium_rate` | `DECIMAL(5,4)` | e.g. `0.0500` = 5% |
| `monthly_premium_min` | `DECIMAL(10,2)` nullable | Floor amount |
| `monthly_premium_max` | `DECIMAL(10,2)` nullable | Ceiling amount |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

### `pagibig_settings`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `effective_year` | `SMALLINT` | |
| `low_income_ceiling` | `DECIMAL(10,2)` | Max salary for low rate |
| `low_income_ee_rate` | `DECIMAL(5,4)` | Employee rate for low bracket |
| `low_income_er_rate` | `DECIMAL(5,4)` | |
| `high_income_ee_rate` | `DECIMAL(5,4)` | |
| `high_income_er_rate` | `DECIMAL(5,4)` | |
| `employee_max_contribution` | `DECIMAL(10,2)` | Cap (₱100) |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

### `bir_tax_brackets`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `effective_year` | `SMALLINT` | |
| `annual_min` | `DECIMAL(15,4)` | Lower bound (inclusive) |
| `annual_max` | `DECIMAL(15,4)` nullable | Upper bound (exclusive); null = top bracket |
| `base_tax` | `DECIMAL(15,4)` | Fixed tax for the bracket |
| `marginal_rate` | `DECIMAL(6,4)` | Rate on excess above `annual_min` |
| `created_at` / `updated_at` | `TIMESTAMP` | |

**Index:** `(effective_year, annual_min)`

---

### `holidays`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `name` | `VARCHAR` | |
| `date` | `DATE` | |
| `year` | `SMALLINT` | |
| `type` | `ENUM(regular, special_non_working, special_working)` | |
| `is_recurring` | `BOOLEAN` | e.g. New Year |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

### `payroll_periods`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `name` | `VARCHAR` | e.g. `May 1-15, 2026 (1st cut)` |
| `frequency` | `ENUM(monthly, semi_monthly, weekly, bi_weekly)` | |
| `period_start` | `DATE` | |
| `period_end` | `DATE` | |
| `pay_date` | `DATE` nullable | Expected payout date |
| `working_days` | `DECIMAL(6,2)` | For proration |
| `status` | `ENUM(open, processing, closed)` | |
| `remarks` | `TEXT` nullable | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

**Unique:** `(period_start, period_end, frequency)` · **Index:** `status`, `period_start`

---

### `payroll_runs`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `payroll_period_id` | `UUID` FK → `payroll_periods.id` (cascade) | |
| `reference_number` | `VARCHAR` unique | e.g. `PR-202605-001` |
| `scope` | `ENUM(company, department, custom)` | |
| `scope_filters` | `JSON` nullable | `{department_ids: [...], employee_ids: [...]}` |
| `status` | `ENUM(draft, finalized, paid, canceled)` | |
| `total_gross` | `DECIMAL(15,4)` | Roll-up |
| `total_deductions` | `DECIMAL(15,4)` | Roll-up |
| `total_net` | `DECIMAL(15,4)` | Roll-up |
| `total_employer_cost` | `DECIMAL(15,4)` | Gross + employer shares |
| `headcount` | `INT` | Number of payslips generated |
| `generated_by_id` | `UUID` FK → `users.id` nullable | |
| `generated_at` | `TIMESTAMP` nullable | |
| `finalized_by_id` | `UUID` FK → `users.id` nullable | |
| `finalized_at` | `TIMESTAMP` nullable | |
| `computation_snapshot` | `JSON` nullable | Statutory table hashes used |
| `notes` | `TEXT` nullable | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

**RULE: Once `finalized`, this record is immutable. Corrections go to the next period.**

---

### `payslips`
One row per `(payroll_run × employee)`.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `payroll_run_id` | `UUID` FK → `payroll_runs.id` (cascade) | |
| `employee_id` | `UUID` FK → `employees.id` (cascade) | |
| `basic_salary` | `DECIMAL(15,4)` | Snapshot at run time |
| `daily_rate` | `DECIMAL(15,4)` | |
| `hourly_rate` | `DECIMAL(15,4)` | |
| `pay_frequency` | `ENUM(monthly, semi_monthly, weekly, daily)` | |
| `regular_hours` | `DECIMAL(8,2)` | |
| `overtime_hours` | `DECIMAL(8,2)` | |
| `night_diff_hours` | `DECIMAL(8,2)` | |
| `regular_holiday_hours` | `DECIMAL(8,2)` | |
| `special_holiday_hours` | `DECIMAL(8,2)` | |
| `rest_day_hours` | `DECIMAL(8,2)` | |
| `absent_days` | `DECIMAL(8,2)` | |
| `late_minutes` | `DECIMAL(10,2)` | |
| `undertime_minutes` | `DECIMAL(10,2)` | |
| `gross_earnings` | `DECIMAL(15,4)` | Sum of all earning items |
| `total_deductions` | `DECIMAL(15,4)` | Sum of all deduction items |
| `taxable_income` | `DECIMAL(15,4)` | Gross − non-taxable items |
| `net_pay` | `DECIMAL(15,4)` | |
| `sss_employee` | `DECIMAL(15,4)` | |
| `sss_employer` | `DECIMAL(15,4)` | |
| `sss_ec_employer` | `DECIMAL(15,4)` | |
| `philhealth_employee` | `DECIMAL(15,4)` | |
| `philhealth_employer` | `DECIMAL(15,4)` | |
| `pagibig_employee` | `DECIMAL(15,4)` | |
| `pagibig_employer` | `DECIMAL(15,4)` | |
| `withholding_tax` | `DECIMAL(15,4)` | |
| `status` | `ENUM(draft, finalized, paid)` | |
| `generated_at` | `TIMESTAMP` nullable | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

**Unique:** `(payroll_run_id, employee_id)` · **Index:** `employee_id`, `status`

---

### `payslip_items`
Line-item detail for each payslip. Every earning and deduction is an individual row.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `payslip_id` | `UUID` FK → `payslips.id` (cascade) | |
| `category` | `VARCHAR` | `earning_basic`, `earning_overtime`, `earning_holiday`, `earning_allowance`, `earning_bonus`, `deduction_statutory`, `deduction_loan`, `deduction_other` |
| `code` | `VARCHAR` | `BASIC`, `OT_REG`, `SSS_EE`, `WT`, `LOAN_SSS`, etc. |
| `label` | `VARCHAR` | Display name on payslip |
| `quantity` | `DECIMAL(10,4)` | Hours, days, or 1 |
| `rate` | `DECIMAL(15,4)` | Per-unit rate |
| `amount` | `DECIMAL(15,4)` | `quantity × rate` (can be negative for deductions-as-earnings) |
| `is_taxable` | `BOOLEAN` | Affects BIR computation |
| `sort_order` | `INT` | Display order on payslip |
| `meta` | `JSON` nullable | Extra context (e.g. bracket details) |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

### `loans`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `employee_id` | `UUID` FK → `employees.id` (cascade) | |
| `type` | `ENUM(sss, pagibig, company, salary_advance, other)` | |
| `reference_number` | `VARCHAR` nullable | SSS/HDMF ref |
| `principal` | `DECIMAL(15,4)` | Original loan amount |
| `interest_rate` | `DECIMAL(5,4)` | Annual; `0` = non-interest-bearing |
| `terms_months` | `INT` | Repayment period |
| `monthly_amortization` | `DECIMAL(15,4)` | Fixed periodic deduction |
| `outstanding_balance` | `DECIMAL(15,4)` | Decrements on each payroll deduction |
| `start_date` | `DATE` | |
| `end_date` | `DATE` | |
| `status` | `ENUM(active, paid, cancelled, on_hold)` | |
| `notes` | `TEXT` nullable | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

**Index:** `(employee_id, status)`, `type`

---

### `loan_payments`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `loan_id` | `UUID` FK → `loans.id` (cascade) | |
| `payslip_id` | `UUID` FK → `payslips.id` nullable | |
| `amount` | `DECIMAL(15,4)` | Amount deducted in this period |
| `principal_portion` | `DECIMAL(15,4)` | |
| `interest_portion` | `DECIMAL(15,4)` | |
| `balance_after` | `DECIMAL(15,4)` | Outstanding balance after payment |
| `payment_date` | `DATE` | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

## 7. Recruitment Tables

### `job_requisitions`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `department_id` | `UUID` FK → `departments.id` nullable | |
| `position_id` | `UUID` FK → `positions.id` nullable | |
| `requested_by` | `UUID` FK → `employees.id` (cascade) | |
| `approved_by` | `UUID` FK → `users.id` nullable | |
| `headcount` | `TINYINT` | default: `1` |
| `justification` | `TEXT` nullable | |
| `employment_type` | `ENUM(regular, probationary, contractual, part_time, project_based)` | |
| `salary_min` / `salary_max` | `DECIMAL(15,4)` nullable | |
| `status` | `ENUM(draft, pending_approval, approved, rejected, cancelled, fulfilled)` | |
| `notes` | `TEXT` nullable | |
| `approved_at` | `TIMESTAMP` nullable | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

---

### `job_postings`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `job_requisition_id` | `UUID` FK nullable | |
| `title` | `VARCHAR` | |
| `description` | `TEXT` nullable | |
| `requirements` | `TEXT` nullable | |
| `responsibilities` | `TEXT` nullable | |
| `location` | `VARCHAR` nullable | |
| `employment_type` | `ENUM(...)` | |
| `salary_min` / `salary_max` | `DECIMAL(15,4)` nullable | |
| `show_salary` | `BOOLEAN` | default: `false` |
| `status` | `ENUM(draft, published, closed, archived)` | |
| `published_at` / `closes_at` | `TIMESTAMP` nullable | |
| `created_by` | `UUID` FK → `users.id` | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

---

### `applicants`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `job_posting_id` | `UUID` FK → `job_postings.id` (cascade) | |
| `first_name` / `last_name` | `VARCHAR` | |
| `email` | `VARCHAR` | |
| `phone` | `VARCHAR` nullable | |
| `resume_path` | `VARCHAR` nullable | S3 path |
| `cover_letter` | `TEXT` nullable | |
| `source` | `VARCHAR` nullable | `direct`, `referral`, `linkedin`, `jobstreet`, etc. |
| `referrer_name` | `VARCHAR` nullable | |
| `stage` | `ENUM(applied, screening, interview, evaluation, offer, hired, rejected)` | |
| `status` | `ENUM(active, hired, rejected, withdrawn)` | |
| `rejection_reason` | `TEXT` nullable | |
| `metadata` | `JSON` nullable | Extra form fields |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

**Index:** `(job_posting_id, stage)`, `email`

---

### `interview_schedules`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `applicant_id` | `UUID` FK → `applicants.id` (cascade) |
| `scheduled_by` | `UUID` FK → `users.id` |
| `interviewers` | `JSON` nullable — array of user UUIDs |
| `scheduled_at` | `TIMESTAMP` |
| `duration_minutes` | `SMALLINT` (default: 60) |
| `type` | `ENUM(phone_screen, online, onsite, panel, technical, final)` |
| `location` | `VARCHAR` nullable |
| `meeting_link` | `VARCHAR` nullable |
| `status` | `ENUM(scheduled, completed, cancelled, no_show, rescheduled)` |
| `notes` / `feedback` | `TEXT` nullable |
| `created_at` / `updated_at` | `TIMESTAMP` |

---

### `candidate_evaluations`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `applicant_id` | `UUID` FK → `applicants.id` |
| `evaluated_by` | `UUID` FK → `users.id` |
| `stage` | `VARCHAR` |
| `overall_score` | `TINYINT` nullable (1–10) |
| `recommendation` | `ENUM(strong_hire, hire, hold, reject, strong_reject)` nullable |
| `strengths` / `areas_for_improvement` | `TEXT` nullable |
| `notes` | `TEXT` nullable |
| `created_at` / `updated_at` | `TIMESTAMP` |

---

### `offer_letters`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `applicant_id` | `UUID` FK → `applicants.id` |
| `position_id` | `UUID` FK → `positions.id` nullable |
| `offered_salary` | `DECIMAL(15,4)` |
| `start_date` | `DATE` nullable |
| `expiry_date` | `DATE` nullable |
| `status` | `ENUM(pending, accepted, rejected, expired, withdrawn)` |
| `document_path` | `VARCHAR` nullable |
| `issued_by` | `UUID` FK → `users.id` |
| `responded_at` | `TIMESTAMP` nullable |
| `created_at` / `updated_at` | `TIMESTAMP` |

---

## 8. Performance Tables

### `performance_review_cycles`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `name` | `VARCHAR` | |
| `type` | `ENUM(quarterly, semi_annual, annual, probationary, custom)` | |
| `period_start` / `period_end` | `DATE` | |
| `self_assessment_due` / `peer_review_due` / `manager_review_due` | `DATE` nullable | |
| `status` | `ENUM(draft, active, completed, archived)` | |
| `enable_self_assessment` / `enable_peer_review` | `BOOLEAN` | |
| `peer_nomination_limit` | `TINYINT` | default: `3` |
| `instructions` | `TEXT` nullable | |
| `created_by` | `UUID` FK → `users.id` | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

---

### `performance_review_criteria`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `cycle_id` | `UUID` FK → `performance_review_cycles.id` (cascade) |
| `name` | `VARCHAR` |
| `description` | `TEXT` nullable |
| `weight` | `DECIMAL(5,2)` — all criteria in a cycle sum to 100 |
| `max_score` | `TINYINT` — e.g. 5 for a 1–5 scale |
| `sort_order` | `TINYINT` |
| `created_at` / `updated_at` | `TIMESTAMP` |

---

### `performance_goals`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `employee_id` | `UUID` FK → `employees.id` |
| `cycle_id` | `UUID` FK nullable |
| `title` | `VARCHAR` |
| `description` | `TEXT` nullable |
| `target_value` / `actual_value` | `VARCHAR` nullable |
| `unit` | `ENUM(percentage, number, currency, boolean, text)` |
| `weight` | `DECIMAL(5,2)` |
| `status` | `ENUM(draft, active, achieved, partially_achieved, missed, cancelled)` |
| `due_date` | `DATE` nullable |
| `created_by` | `UUID` FK → `users.id` |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` |

---

### `performance_reviews`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `cycle_id` | `UUID` FK → `performance_review_cycles.id` |
| `employee_id` | `UUID` FK → `employees.id` (reviewee) |
| `reviewer_id` | `UUID` FK → `users.id` |
| `review_type` | `ENUM(self, manager, peer)` |
| `status` | `ENUM(pending, in_progress, submitted, acknowledged)` |
| `overall_score` | `DECIMAL(5,2)` nullable — computed weighted average |
| `strengths` / `areas_for_improvement` / `development_plan` | `TEXT` nullable |
| `employee_comments` | `TEXT` nullable |
| `is_anonymous` | `BOOLEAN` — for peer reviews |
| `submitted_at` / `acknowledged_at` | `TIMESTAMP` nullable |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` |

**Unique:** `(cycle_id, employee_id, reviewer_id, review_type)`

---

### `performance_review_scores`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `review_id` | `UUID` FK → `performance_reviews.id` (cascade) |
| `criteria_id` | `UUID` FK → `performance_review_criteria.id` |
| `score` | `DECIMAL(5,2)` |
| `comments` | `TEXT` nullable |
| `created_at` / `updated_at` | `TIMESTAMP` |

**Unique:** `(review_id, criteria_id)`

---

## 9. Asset Management Tables

### `asset_categories`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `name` | `VARCHAR` unique |
| `icon` | `VARCHAR(64)` nullable |
| `description` | `TEXT` nullable |
| `created_at` / `updated_at` | `TIMESTAMP` |

---

### `assets`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `asset_tag` | `VARCHAR` unique | e.g. `AST-0001` (QR/barcode) |
| `category_id` | `UUID` FK → `asset_categories.id` nullable | |
| `name` | `VARCHAR` | |
| `brand` / `model` / `serial_number` | `VARCHAR` nullable | |
| `purchased_at` | `DATE` nullable | |
| `purchase_cost` | `DECIMAL(15,4)` nullable | |
| `vendor` | `VARCHAR` nullable | |
| `warranty_expires_at` | `DATE` nullable | |
| `status` | `ENUM(available, assigned, under_maintenance, lost, retired)` | |
| `condition` | `ENUM(new, good, fair, poor, damaged)` | |
| `location` | `VARCHAR` nullable | |
| `notes` | `TEXT` nullable | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

---

### `asset_assignments`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `asset_id` | `UUID` FK → `assets.id` (cascade) |
| `employee_id` | `UUID` FK → `employees.id` (cascade) |
| `assigned_by` | `UUID` FK → `users.id` (cascade) |
| `assigned_on` | `DATE` |
| `returned_on` | `DATE` nullable |
| `returned_to` | `UUID` FK → `users.id` nullable |
| `return_condition` | `ENUM(new, good, fair, poor, damaged)` nullable |
| `notes` | `TEXT` nullable |
| `created_at` / `updated_at` | `TIMESTAMP` |

---

### `asset_maintenance_logs`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `asset_id` | `UUID` FK → `assets.id` (cascade) |
| `logged_by` | `UUID` FK → `users.id` |
| `type` | `ENUM(inspection, repair, upgrade, cleaning, other)` |
| `performed_on` | `DATE` |
| `next_due_on` | `DATE` nullable |
| `cost` | `DECIMAL(15,4)` |
| `vendor` | `VARCHAR` nullable |
| `description` | `TEXT` nullable |
| `created_at` / `updated_at` | `TIMESTAMP` |

---

## 10. Compliance Tables

### `compliance_policies`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `title` | `VARCHAR` | |
| `category` | `VARCHAR(64)` | `code_of_conduct`, `data_privacy`, `labor`, `general` |
| `version` | `SMALLINT` | default: `1` — increments on republish |
| `body` | `LONGTEXT` | Markdown or rich-text |
| `effective_on` | `DATE` nullable | |
| `expires_on` | `DATE` nullable | |
| `requires_acknowledgment` | `BOOLEAN` | |
| `status` | `ENUM(draft, published, archived)` | |
| `published_by` | `UUID` FK → `users.id` nullable | |
| `published_at` | `TIMESTAMP` nullable | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

**Index:** `(category, status)`, `effective_on`

---

### `policy_acknowledgments`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `policy_id` | `UUID` FK → `compliance_policies.id` (cascade) |
| `employee_id` | `UUID` FK → `employees.id` (cascade) |
| `acknowledged_at` | `TIMESTAMP` |
| `ip_address` | `VARCHAR(45)` nullable |
| `user_agent` | `TEXT` nullable |
| `created_at` / `updated_at` | `TIMESTAMP` |

**Unique:** `(policy_id, employee_id)`

---

### `regulatory_filings`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `agency` | `VARCHAR(32)` | `SSS`, `PhilHealth`, `Pag-IBIG`, `BIR`, `DOLE` |
| `form_code` | `VARCHAR` | e.g. `R-3`, `RF-1`, `MCRF`, `1601-C` |
| `title` | `VARCHAR` | |
| `period_covered_start` / `period_covered_end` | `DATE` nullable | |
| `due_on` | `DATE` | |
| `status` | `ENUM(pending, in_progress, filed, overdue, cancelled)` | |
| `filed_on` | `DATE` nullable | |
| `reference_number` | `VARCHAR` nullable | |
| `filed_by` | `UUID` FK → `users.id` nullable | |
| `notes` | `TEXT` nullable | |
| `created_at` / `updated_at` / `deleted_at` | `TIMESTAMP` | |

**Index:** `(agency, status)`, `due_on`

---

## 11. Integration Tables

### `api_keys`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `name` | `VARCHAR` | Human label |
| `key_prefix` | `VARCHAR(12)` | First 8 chars for display |
| `key_hash` | `VARCHAR` unique | SHA-256 of full key — original never stored |
| `scopes` | `JSON` nullable | e.g. `["attendance:write", "payroll:read"]` |
| `rate_limit_per_minute` | `INT` | default: `60` |
| `last_used_at` | `TIMESTAMP` nullable | |
| `last_used_ip` | `VARCHAR(45)` nullable | |
| `revoked_at` | `TIMESTAMP` nullable | |
| `created_by` | `UUID` FK → `users.id` (cascade) | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

### `webhook_subscriptions`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `name` | `VARCHAR` | |
| `target_url` | `VARCHAR(2048)` | Outbound delivery URL |
| `signing_secret` | `VARCHAR` | HMAC-SHA256 signing key |
| `events` | `JSON` | e.g. `["payroll.run.finalized", "leave.approved"]` |
| `is_active` | `BOOLEAN` | |
| `max_retries` | `TINYINT` | default: `3` |
| `created_by` | `UUID` FK → `users.id` | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

---

### `webhook_deliveries`

| Column | Type |
|---|---|
| `id` | `UUID` PK |
| `subscription_id` | `UUID` FK → `webhook_subscriptions.id` |
| `event_name` | `VARCHAR` |
| `payload` | `JSON` |
| `response_status` | `SMALLINT` nullable |
| `response_body` | `TEXT` nullable |
| `attempts` | `TINYINT` |
| `delivered_at` / `failed_at` | `TIMESTAMP` nullable |
| `created_at` / `updated_at` | `TIMESTAMP` |

---

### `integration_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `integration` | `VARCHAR(64)` | `biometric`, `accounting`, `sso`, `sms` |
| `direction` | `VARCHAR(16)` | `inbound` or `outbound` |
| `endpoint` | `VARCHAR` nullable | |
| `status_code` | `SMALLINT` nullable | |
| `request_payload` | `JSON` nullable | |
| `response_payload` | `JSON` nullable | |
| `error_message` | `TEXT` nullable | |
| `api_key_id` | `UUID` FK → `api_keys.id` nullable | |
| `source_ip` | `VARCHAR(45)` nullable | |
| `created_at` / `updated_at` | `TIMESTAMP` | |

**Index:** `(integration, created_at)`

---

## 12. System Tables

### `cache` / `cache_locks`
Standard Laravel cache tables.

### `jobs` / `failed_jobs`
Laravel queue tables. `jobs` table for pending queue jobs; `failed_jobs` for exceptions.

### `personal_access_tokens`
Laravel Sanctum tokens. Keyed by `tokenable_type` + `tokenable_id` (UUID).

---

## 13. Entity Relationship Summary

```
users ──────────────────────── employees (1:1)
                                    │
             ┌──────────────────────┼────────────────────────┐
             ▼                      ▼                        ▼
     attendance_logs          leave_requests           payslips
                                    │                        │
                               leave_balances          payslip_items
                               leave_types              loan_payments
                                                             │
                                                         loans

employees ──► departments (many:1, department has parent_id self-ref)
employees ──► positions (many:1)
employees ──► employees (reports_to_id, self-ref hierarchy)

payroll_runs ──► payroll_periods (many:1)
payroll_runs ──► payslips (1:many)
payslips ──► payslip_items (1:many)
payslips ──► loan_payments (1:many, via loan deduction)

job_requisitions ──► job_postings ──► applicants
applicants ──► interview_schedules (1:many)
applicants ──► candidate_evaluations (1:many)
applicants ──► offer_letters (1:1)

performance_review_cycles ──► performance_review_criteria (1:many)
performance_review_cycles ──► performance_reviews (1:many)
performance_reviews ──► performance_review_scores (1:many, per criteria)
employees ──► performance_goals (1:many)

assets ──► asset_assignments (1:many, history)
assets ──► asset_maintenance_logs (1:many)
asset_assignments ──► employees (many:1)

compliance_policies ──► policy_acknowledgments (1:many)
employees ──► policy_acknowledgments (1:many)

users ──► roles (many:many via user_roles)
roles ──► permissions (many:many via role_permissions)

audit_logs ──► any model (polymorphic via target_type + target_id)
```

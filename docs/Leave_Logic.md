# Leave Logic — iHRIS

> **Core Files:**
> - `api/app/Services/Ess/EssLeaveService.php`
> - `api/app/Models/LeaveRequest.php`
> - `api/app/Models/LeaveBalance.php`
> - `api/app/Models/LeaveType.php`
> - `api/app/Http/Controllers/Api/V1/Ess/EssLeaveController.php`
> - Migration: `2026_05_08_000003_create_leave_tables.php`

---

## 1. Overview

The leave system manages employee leave requests with balance tracking, multi-level approval, and payroll integration. It supports configurable leave types including Philippine Labor Code-mandated types.

---

## 2. Leave Types

### System Leave Types (cannot be deleted)

| Code | Name | Default Credits | Notes |
|---|---|---|---|
| `vl` | Vacation Leave | 15 | Accrual configurable |
| `sl` | Sick Leave | 15 | Requires medical cert if >2 days |
| `emergency` | Emergency Leave | 3 | |
| `maternity` | Maternity Leave | 105 | PH Labor Code RA 11210 (105 days) |
| `paternity` | Paternity Leave | 7 | PH Labor Code |
| `solo_parent` | Solo Parent Leave | 7 | RA 8972 |
| `sil` | Service Incentive Leave | 5 | 5 days SIL per Labor Code |

### Custom Types
HR Admin can create additional types (e.g. birthday leave, bereavement, study leave) via the admin interface.

**`leave_types` fields of note:**
- `default_credits = 0` means **unlimited / non-accruing** (e.g. emergency leave where days are counted but there's no hard cap)
- `requires_attachment = true` enforces document upload (e.g. medical certificate for SL)
- `is_paid` determines whether absence deduction applies in payroll

---

## 3. Leave Balance

### Balance Initialization

Balances are **lazily created** — when an employee first accesses their balances or files a leave:

```php
LeaveBalance::firstOrCreate(
    ['employee_id' => $employee->id, 'leave_type_id' => $type->id, 'year' => $year],
    ['credits' => $type->default_credits, 'used' => 0, 'pending' => 0],
)
```

### Balance Calculation

```
available = credits - used - pending
```

- `credits` — total allocated for the year
- `used` — days consumed (approved and past)
- `pending` — days in pending approval (reserved but not yet consumed)

**When leave is filed:** `pending += total_days`  
**When leave is approved:** `used += total_days`, `pending -= total_days`  
**When leave is rejected/cancelled:** `pending -= total_days`

---

## 4. Leave Request Lifecycle

```
Employee files leave
  └── POST /api/v1/ess/leave
      ├── EssLeaveService::fileLeave()
      ├── Validates sufficient balance
      ├── Reserves pending days: LeaveBalance.pending += total_days
      ├── Creates LeaveRequest with status = 'pending'
      └── AuditLogger::log('leave.filed', ...)

HR/Manager reviews (not yet an ESS endpoint — HR Admin portal)
  ├── Approve:
  │   ├── LeaveRequest.status = 'approved'
  │   ├── LeaveBalance.used += total_days
  │   ├── LeaveBalance.pending -= total_days
  │   ├── AuditLogger::log('leave.approved', ...)
  │   └── AttendanceLog rows for the leave period → status = 'on_leave'
  └── Reject:
      ├── LeaveRequest.status = 'rejected'
      ├── LeaveBalance.pending -= total_days  (credits returned)
      └── AuditLogger::log('leave.rejected', ...)

Employee cancels (only if still pending)
  └── DELETE /api/v1/ess/leave/{id}
      ├── EssLeaveService::cancelLeave()
      ├── Only the filing employee can cancel their own request
      ├── Only status = 'pending' can be cancelled
      ├── LeaveBalance.pending -= total_days  (credits returned)
      └── AuditLogger::log('leave.cancelled', ...)
```

---

## 5. Filing Leave — Validation Rules

```
1. leave_type must exist and is_active = true
2. start_date <= end_date
3. total_days must be > 0
4. If leave_type.default_credits > 0 (not unlimited):
   └── balance.available >= total_days (throws if insufficient)
5. If leave_type.requires_attachment:
   └── attachment_path must be provided (validated at controller level)
6. Cannot file for dates in the past (configurable — some companies allow backdated)
7. Cannot overlap with another active leave request for the same dates
```

---

## 6. Half-Day Leave

The `total_days` column is `DECIMAL(5,1)` which supports `0.5` for half-day leave.

**Frontend sends:**
```json
{
  "leave_type_id": "...",
  "start_date": "2026-05-10",
  "end_date": "2026-05-10",
  "total_days": 0.5,
  "reason": "Dentist appointment"
}
```

Half-day leaves consume 0.5 credits and result in half-day absent/undertime in attendance.

---

## 7. Multi-Level Approval

The `approvals` JSON column in `leave_requests` tracks the approval chain:

```json
[
  {
    "level": 1,
    "approver_id": "uuid-of-manager",
    "status": "approved",
    "note": "Approved.",
    "decided_at": "2026-05-09T10:30:00Z"
  },
  {
    "level": 2,
    "approver_id": "uuid-of-hr-admin",
    "status": "pending",
    "note": null,
    "decided_at": null
  }
]
```

`current_approver_level` tracks which level is awaiting action. Both levels must approve for the leave to be `approved`. If any level rejects → leave is `rejected`.

**Current implementation:** 2-level approval (Manager → HR Admin). Configurable per leave type in future.

---

## 8. ESS Leave Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/ess/leave/types` | All active leave types |
| `GET` | `/api/v1/ess/leave/balances` | Employee's balances for current year (auto-provisions if missing) |
| `GET` | `/api/v1/ess/leave` | Employee's leave requests (filter by `status`) |
| `POST` | `/api/v1/ess/leave` | File a new leave request |
| `DELETE` | `/api/v1/ess/leave/{id}` | Cancel a pending request |

All require `auth:sanctum` + `permission:ess.self.access`.

---

## 9. Payroll Integration

Leave integrates with payroll in two ways:

### 9.1 Absence Deduction
When a leave request is **not paid** (`is_paid = false`) or employee has **no remaining credits**:
- The days are passed to `PayrollInputs.absentDays` for the period
- Results in `ABSENT` line item (negative earning) on the payslip

When a leave request is **paid** and credits exist:
- No absence deduction — days are covered by the leave credit
- The payslip shows no deduction for those days

### 9.2 Leave Encashment
Unused leave credits can be encashed in specific scenarios (company policy or separation):
- Calculated in `FinalPayService` for separated employees
- Formula: `unused_days × daily_rate`
- Added as earning item `LEAVE_ENCASH` in the final pay payslip

---

## 10. Leave Calendar Integration

The leave system feeds the HR calendar:

- Approved leave requests appear as blocked dates for the employee in the team calendar
- Leave conflicts: system warns when another team member has leave on the same date
- Holiday dates from `holidays` table are blocked and auto-set attendance to `holiday`

---

## 11. Annual Leave Processing

At fiscal year end (typically January 1 or configurable):

**Laravel Scheduler task:**
1. For each active employee, for each leave type:
   - If `carry_over = true` (future config): transfer unused credits (up to carry-over limit) to the new year
   - Reset `used = 0` and `pending = 0` for the new year
   - Set `credits = default_credits` (or pro-rated for new hires)
2. Generate leave balance rows for the new year

**Current implementation:** No automatic carry-over yet — each year's balance is independent.

---

## 12. Leave Report Integration

Reports available via `GET /api/v1/reports/leaves`:
- Leave utilization per employee / department
- Leave balance summary
- Leave history with filters (type, status, date range)
- Sick leave patterns (frequency analysis)
- Export to Excel/PDF/CSV

---

## 13. Sick Leave Attachment

When `leave_type.requires_attachment = true`:
1. Employee uploads medical certificate via the ESS portal
2. File stored in `storage/app/leave-attachments/{employee_id}/`
3. `leave_requests.attachment_path` stores the relative path
4. HR can download the attachment during review

---

## 14. Service Incentive Leave (SIL) — PH Compliance

Per Philippine Labor Code Article 95:
- All employees who have rendered at least 1 year of service are entitled to 5 days SIL
- SIL is convertible to cash at the end of the year if not used
- The system tracks SIL via `code = 'sil'` leave type with `default_credits = 5`

---

## 15. Maternity / Paternity Leave — PH Compliance

**Maternity Leave (RA 11210):**
- 105 calendar days with full pay for the first 4 children
- Extended by 30 days (unpaid) on request
- Solo parents: additional 15 days
- Implemented as `code = 'maternity'`, `default_credits = 105`

**Paternity Leave (RA 8187):**
- 7 calendar days with full pay for the first 4 deliveries
- Implemented as `code = 'paternity'`, `default_credits = 7`

These types have `is_system = true` — they cannot be deleted or renamed, only enabled/disabled.

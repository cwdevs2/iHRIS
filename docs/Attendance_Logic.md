# Attendance Logic — iHRIS

> **Core Files:**
> - `api/app/Services/Ess/EssAttendanceService.php`
> - `api/app/Models/AttendanceLog.php`
> - `api/app/Models/AttendanceCorrectionRequest.php`
> - `api/app/Http/Controllers/Api/V1/Ess/EssAttendanceController.php`
> - Migration: `2026_05_08_000001_create_attendance_logs_table.php`
> - Migration: `2026_05_08_000002_create_attendance_correction_requests_table.php`

---

## 1. Overview

Attendance in iHRIS follows a **clock-in / clock-out** model with one log per employee per calendar day. All timestamps are stored in UTC and displayed in `Asia/Manila` on the frontend.

The system supports multiple entry modes:
- **Web** — browser-based via ESS portal
- **QR Code** — time-based rotating QR scanned by employee
- **Biometric** — inbound webhook from physical device
- **GPS** — with optional location tagging
- **Manual** — HR Admin correction

---

## 2. Data Model

### `attendance_logs`
One row per `(employee_id, work_date)` — enforced by unique constraint.

**Key fields:**
- `clock_in_at` / `clock_out_at` — UTC timestamps
- `regular_hours` — computed on clock-out (max 8.0)
- `overtime_hours` — hours beyond 8 (pending separate approval)
- `late_minutes` — tardiness (computed against shift schedule)
- `undertime_minutes` — early departure
- `status` — `present`, `late`, `undertime`, `absent`, `on_leave`, `holiday`
- `is_corrected` — flagged when a correction was approved and applied
- `source` — `web`, `qr`, `biometric`, `manual`

---

## 3. Clock-In Logic

**Endpoint:** `POST /api/v1/ess/attendance/clock-in`

**Service:** `EssAttendanceService::clockIn(Employee $employee, Carbon $now, array $meta)`

```
1. Verify no existing clock_in_at for today
   └── If exists: throw RuntimeException("Already clocked in today.")

2. AttendanceLog::updateOrCreate(
     ['employee_id' => $employee->id, 'work_date' => today],
     [
       'clock_in_at'   => $now (UTC),
       'clock_in_ip'   => meta.ip,
       'clock_in_lat'  => meta.lat,
       'clock_in_lng'  => meta.lng,
       'location_type' => meta.location_type (on_site|remote|field),
       'source'        => meta.source (web|qr|biometric|manual),
       'status'        => 'present'
     ]
   )

3. AuditLogger::log('attendance.clock_in', target: $log, actor: $user)

4. Return AttendanceLog
```

**Frontend sends:**
```json
{
  "lat": 14.5995,
  "lng": 120.9842,
  "location_type": "on_site"
}
```

---

## 4. Clock-Out Logic

**Endpoint:** `POST /api/v1/ess/attendance/clock-out`

**Service:** `EssAttendanceService::clockOut(Employee $employee, Carbon $now, array $meta)`

```
1. Find today's attendance log
   └── If not found: throw RuntimeException("Cannot clock out: no clock-in record for today.")
   └── If already clocked out: throw RuntimeException("Already clocked out today.")

2. Compute hours:
   total_minutes = clock_in_at.diffInMinutes($now)
   total_hours   = round(total_minutes / 60, 2)

   regular_hours  = min(total_hours, 8.0)
   overtime_hours = max(0, total_hours - 8.0)

3. Update log:
   clock_out_at     = $now (UTC)
   clock_out_ip     = meta.ip
   clock_out_lat    = meta.lat
   clock_out_lng    = meta.lng
   regular_hours    = computed
   overtime_hours   = computed (stored but pending approval)

4. AuditLogger::log('attendance.clock_out', ...)

5. Return refreshed AttendanceLog
```

**Hours computation:**
```
Standard shift = 8 hours
regular_hours  = min(actual_hours_worked, 8.0)
overtime_hours = max(0, actual_hours_worked − 8.0)
```

> **Note:** `overtime_hours` in the log represents *claimed* overtime. It requires separate HR/Manager approval before being included in payroll as a paid OT item.

---

## 5. Late and Undertime Detection

Late and undertime are currently computed based on a **fixed 8-hour shift assumption**. Future enhancement will compare against an employee's assigned shift schedule.

**Current logic (applied at payroll generation time):**
- `late_minutes` is captured in the log if the employee's department has a configured shift start
- `undertime_minutes` is captured if clock-out is before the configured shift end

**In payroll:**
```
Tardiness deduction = hourly_rate / 60 × late_minutes
Undertime deduction = hourly_rate / 60 × undertime_minutes
```

Both are represented as **negative earning items** in the payslip (not as separate deductions).

---

## 6. Attendance Status Values

| Status | Meaning |
|---|---|
| `present` | Clocked in and out normally |
| `late` | Clock-in after shift start |
| `undertime` | Clock-out before shift end |
| `absent` | No clock-in for a workday (set by scheduler or HR) |
| `on_leave` | Leave request approved for the day |
| `holiday` | Regular or special holiday |

---

## 7. Attendance Correction Requests

### Purpose
Employees who forgot to clock in/out, or had a device issue, file a correction request. HR or Manager reviews and approves/rejects.

### Flow

```
Employee → POST /api/v1/ess/attendance/corrections
  Body: {
    work_date: "2026-05-08",
    requested_clock_in: "2026-05-08T08:00:00Z",
    requested_clock_out: "2026-05-08T17:00:00Z",
    reason: "Forgot to clock in, was working remotely"
  }

Service: EssAttendanceService::fileCorrection()
  1. Check if AttendanceLog exists for work_date
     └── store attendance_log_id if found (nullable if no log yet)
  2. Create AttendanceCorrectionRequest:
     status = 'pending'
  3. AuditLogger::log('attendance.correction_filed', ...)

HR/Manager reviews via HR Admin portal (not yet ESS endpoint — needs future route)

On approval:
  1. Update AttendanceLog (or create if missing):
     clock_in_at = requested_clock_in
     clock_out_at = requested_clock_out
     is_corrected = true
     source = 'manual'
     Recompute regular_hours / overtime_hours
  2. Update correction.status = 'approved'
  3. AuditLogger::log('attendance.correction_approved', ...)
```

### `attendance_correction_requests` Table

| Field | Notes |
|---|---|
| `attendance_log_id` | nullable — the log being corrected (or null if no log existed) |
| `work_date` | The date being corrected |
| `requested_clock_in` | What the employee says the actual time was |
| `requested_clock_out` | |
| `reason` | Required — employee's explanation |
| `status` | `pending`, `approved`, `rejected` |
| `reviewer_note` | HR/Manager feedback |

---

## 8. Biometric Integration

External biometric devices push attendance events via API:

**Endpoint:** `POST /api/v1/integrations/biometric/events`  
**Auth:** `X-Api-Key` header with scope `attendance:write`

**Payload format:**
```json
{
  "device_id": "GATE-01",
  "employee_number": "EMP-0042",
  "event_type": "clock_in",
  "timestamp": "2026-05-08T07:58:23Z"
}
```

**Processing:**
1. `BiometricWebhookController::ingest()` resolves employee by `employee_number`
2. Delegates to `EssAttendanceService::clockIn()` with `source = 'biometric'`
3. Every request logged to `integration_logs` via `AuthenticateApiKey` middleware

---

## 9. ESS Attendance Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/ess/attendance` | Paginated list of employee's logs (filters: `from`, `to`) |
| `GET` | `/api/v1/ess/attendance/today` | Today's log or null |
| `POST` | `/api/v1/ess/attendance/clock-in` | Record clock-in |
| `POST` | `/api/v1/ess/attendance/clock-out` | Record clock-out |
| `GET` | `/api/v1/ess/attendance/corrections` | Employee's correction requests |
| `POST` | `/api/v1/ess/attendance/corrections` | File a correction request |

All ESS routes require:
- `auth:sanctum` middleware
- `permission:ess.self.access` permission
- The authenticated user must have a linked Employee record

---

## 10. Payroll Integration

Attendance data flows into payroll via `PayrollInputs`:

```
When HR generates a payroll run:
  → Provides per-employee inputs (manually today, auto-fetch from logs in future)
  → PayrollInputs.absentDays     = count of absent days in period
  → PayrollInputs.lateMinutes    = sum of late_minutes in period
  → PayrollInputs.undertimeMinutes = sum of undertime_minutes in period
  → PayrollInputs.overtimeHours  = sum of approved overtime_hours in period
  → PayrollInputs.regularHolidayHours / specialHolidayHours / nightDiffHours

Future: auto-aggregate attendance_logs for the payroll_period dates
```

**Rule:** Only **approved** overtime hours count in payroll. Raw `overtime_hours` in `attendance_logs` are claims pending approval.

---

## 11. Immutability Rule

`attendance_logs` are treated as an immutable log:
- Clock-in creates or updates the row for today
- Clock-out updates (not replaces) the existing row
- Corrections **do not delete** the original log — they update `is_corrected = true` and update the timestamps
- The original clock-in/out times are overwritten on approval (the audit log preserves the before state)

---

## 12. Location Validation (Future Enhancement)

GPS validation is not yet enforced but the schema supports it:
- `clock_in_lat` / `clock_in_lng` / `clock_out_lat` / `clock_out_lng` stored per entry
- `location_type`: `on_site`, `remote`, `field`

Future: add a geofence check — if `location_type = on_site`, verify coordinates are within configured radius of office location.

---

## 13. QR Code Attendance (Future Enhancement)

The `source = 'qr'` value is reserved for QR-based clock-in via rotating time-based QR codes. Planned approach:
- QR code generated per shift, refreshes every 5 minutes (based on TOTP-style time window)
- Employee scans QR, which encodes `{location_id, time_window}` payload
- Backend validates the time window is current before recording the log

---

## 14. Admin Attendance Management

The Admin Attendance Management module (`GET /admin/attendance`) gives HR full visibility and control over attendance data.

### Admin Endpoints (`/api/v1/admin/attendance`)

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/admin/attendance` | `attendance.logs.manage` | List all logs with filters (`from`, `to`, `employee_id`, `status`) |
| POST | `/admin/attendance/manual` | `attendance.logs.manage` | Create a manual attendance entry for any employee |
| GET | `/admin/attendance/corrections` | `attendance.logs.manage` | List all correction requests with status filter |
| PATCH | `/admin/attendance/corrections/{id}/approve` | `attendance.logs.manage` | Approve a correction request |
| PATCH | `/admin/attendance/corrections/{id}/reject` | `attendance.logs.manage` | Reject a correction request |

### Shift Configuration

Employees have shift fields added via migration `2026_05_08_000004_add_shift_to_employees_table.php`:

| Column | Type | Description |
|--------|------|-------------|
| `shift_type` | string (default: `day`) | `day`, `mid`, or `night` |
| `shift_start` | time | Scheduled start time (e.g. `08:00:00`) |
| `shift_end` | time | Scheduled end time (e.g. `17:00:00`) |
| `work_days` | JSON | Array of day numbers (0=Sun–6=Sat) |

These shift fields are editable in `EmployeeFormModal` (Work Schedule section) and are used to calculate late/undertime.

### Admin Frontend

**Page**: `web/src/pages/attendance/AdminAttendanceManagementPage.tsx`  
**Route**: `/attendance/manage`

**Tabs:**
1. **Attendance Logs** — date range + employee search filter, view all logs with employee name, position, clock times, hours, status
2. **Correction Requests** — filter by status (pending/approved/rejected/all), approve or reject with one click
3. **Manual Entry** — form to create attendance record for any employee; fields: employee, date, clock in/out, status, remarks

**Hooks**: `useAdminAttendance`, `useAdminCorrections`, `useApproveCorrection`, `useRejectCorrection`, `useManualAttendanceEntry` (all from `web/src/hooks/useAdminAttendance.ts`)

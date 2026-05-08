# Payroll Logic — iHRIS

> **Jurisdiction:** Philippines · **Basis:** Labor Code of the Philippines, TRAIN Law 2023, SSS/PhilHealth/Pag-IBIG 2024 schedules  
> **Core Files:**
> - `api/app/Services/Payroll/PayrollEngineService.php`
> - `api/app/Services/Payroll/PayrollRunService.php`
> - `api/app/Services/Payroll/RateCalculator.php`
> - `api/app/Services/Payroll/Money.php`
> - `api/app/Services/Payroll/PayrollInputs.php`
> - `api/app/Services/Payroll/Statutory/BirTaxCalculator.php`
> - `api/app/Services/Payroll/Statutory/SssCalculator.php`
> - `api/app/Services/Payroll/Statutory/PhilhealthCalculator.php`
> - `api/app/Services/Payroll/Statutory/PagibigCalculator.php`

---

## 1. Payroll Lifecycle

```
1. HR creates a PayrollPeriod (e.g. "May 1–15, 2026")
   └── payroll_periods: status = 'open'

2. HR creates a PayrollRun against the period
   └── payroll_runs: status = 'draft'

3. HR provides per-employee inputs (hours, absences, etc.) and triggers generate
   └── PayrollRunService::generatePayslips() called
   └── For each employee → PayrollEngineService::computeForEmployee()
   └── payslips + payslip_items + loan_payments written to DB

4. HR reviews payslips (can regenerate if corrections needed while still draft)

5. HR finalizes the run
   └── payroll_runs: status = 'finalized'
   └── payslips: status = 'finalized'
   └── Run becomes immutable — no further regeneration allowed

6. HR marks as paid
   └── payroll_runs: status = 'paid'
   └── payslips: status = 'paid'
   └── Employees can now download their payslips via ESS

7. Compliance reports generated for SSS/PhilHealth/Pag-IBIG/BIR remittances
```

---

## 2. Rate Calculation

**File:** `RateCalculator::fromEmployee($employee, $monthlyWorkingDays)`

| Pay Frequency | Monthly Equivalent | Daily Rate | Hourly Rate |
|---|---|---|---|
| `monthly` | `basic_salary` | `monthly / working_days` | `daily / 8` |
| `semi_monthly` | `basic_salary × 2` | `monthly / working_days` | `daily / 8` |
| `weekly` | `basic_salary × 52 / 12` | `monthly / working_days` | `daily / 8` |
| `daily` | `basic_salary × working_days` | `basic_salary` | `daily / 8` |

**Default working days per month:** 22 (configurable per period via `payroll_periods.working_days`).

**Basic pay for period:**

| Pay Frequency | Formula |
|---|---|
| `monthly` | `monthly_rate × 1` |
| `semi_monthly` | `monthly_rate / 2` |
| `weekly` | `monthly_rate / (working_days / 5)` |
| `daily` | `daily_rate × days_in_period` |

---

## 3. Earnings Computation

### 3.1 Basic Pay

```
basic_for_period = proration of monthly_rate based on pay_frequency
```

### 3.2 Absence / Late / Undertime (Negative Earnings)

These are entered as **negative earning items** (not deductions) to correctly reduce taxable income per BIR "no work, no pay" doctrine.

```
Absences     = −(daily_rate × absent_days)
Tardiness    = −(hourly_rate / 60 × late_minutes)
Undertime    = −(hourly_rate / 60 × undertime_minutes)
```

### 3.3 Overtime Pay

| Scenario | Premium | Formula |
|---|---|---|
| Weekday OT | +25% | `hourly_rate × 1.25 × overtime_hours` |
| Rest day worked (regular hours) | +30% | `hourly_rate × 1.30 × rest_day_hours` |
| Regular holiday worked | +100% | `hourly_rate × 2.00 × regular_holiday_hours` |
| Special non-working holiday worked | +30% | `hourly_rate × 1.30 × special_holiday_hours` |

### 3.4 Night Differential

```
ND premium = hourly_rate × 0.10 × night_diff_hours
```
Applied on top of existing OT/holiday premiums for hours between 10PM–6AM.

### 3.5 Allowances & Bonuses

Passed via `PayrollInputs.allowances` and `PayrollInputs.bonuses` arrays:

```json
{
  "code": "RICE_ALLOW",
  "label": "Rice Allowance",
  "amount": 2000.00,
  "is_taxable": false
}
```

Non-taxable allowances (e.g. rice allowance up to ₱2,000/month) are excluded from BIR withholding tax base.

---

## 4. Gross Pay Formula

```
Gross Pay = Basic Pay
          + Absences (negative)
          + Tardiness (negative)
          + Undertime (negative)
          + Overtime Pay
          + Rest Day Premium
          + Holiday Pay
          + Night Differential
          + Allowances
          + Bonuses
          + Other Earnings

Taxable Income = Gross Pay − Non-taxable items
```

---

## 5. Statutory Deductions

All statutory tables are stored in the database and seeded. They can be updated by HR Admin without code deployment.

### 5.1 SSS (Social Security System)

**File:** `SssCalculator.php`

**Basis:** Monthly compensation (gross monthly basic salary)

**Algorithm:**
1. Find the matching bracket in `sss_contribution_brackets` for the effective year
2. If no bracket matches (above ceiling), use the highest bracket
3. Return fixed peso amounts: `employee_share`, `employer_share`, `ec_share`

**For semi-monthly payroll:** The SSS deduction is applied in full on the **first cut** of the month only (to avoid double deduction). The second cut carries ₱0 SSS deduction.

**Period adjustment rule:**
- `semi_monthly` → apply full SSS on cut 1 only (first half of month)
- `monthly` → apply full SSS
- `weekly` / `bi_weekly` → split proportionally

---

### 5.2 PhilHealth

**File:** `PhilhealthCalculator.php`

**Basis:** Monthly basic salary

**Current schedule (2024):**
- Premium rate: **5%** of monthly basic salary
- Shared equally: 2.5% employee / 2.5% employer
- Minimum monthly premium: ₱500 (₱250 EE share)
- Maximum monthly premium: ₱5,000 (₱2,500 EE share)

**Algorithm:**
1. `monthly_premium = monthly_basic × premium_rate`
2. Clamp: `max(min_premium, min(max_premium, monthly_premium))`
3. `employee_share = monthly_premium / 2`
4. `employer_share = monthly_premium / 2`
5. For period: divide by pay periods per month

---

### 5.3 Pag-IBIG (HDMF)

**File:** `PagibigCalculator.php`

**Current schedule (2024):**
| Monthly Compensation | Employee Rate | Employer Rate |
|---|---|---|
| ≤ ₱1,500 | 1% | 2% |
| > ₱1,500 | 2% | 2% |

**Employee contribution cap:** ₱100/month

**Algorithm:**
1. Determine rate tier from `pagibig_settings` for the year
2. `employee_contribution = min(monthly_compensation × ee_rate, max_employee_contribution)`
3. `employer_contribution = monthly_compensation × er_rate` (no cap on employer)
4. For period: divide by pay periods per month

---

### 5.4 BIR Withholding Tax (TRAIN Law 2023)

**File:** `BirTaxCalculator.php`

**Algorithm (annualization method):**

```
1. annualised_taxable = period_taxable_income × pay_periods_per_year

   Pay-period factors:
   monthly       → 12
   semi_monthly  → 24
   weekly        → 52
   bi_weekly     → 26
   daily         → 261

2. Find bracket in bir_tax_brackets where:
   annual_min ≤ annualised_taxable AND
   (annual_max IS NULL OR annual_max > annualised_taxable)

3. annual_tax = base_tax + (annualised_taxable − annual_min) × marginal_rate

4. period_tax = annual_tax / pay_periods_per_year

5. Withholding tax = max(0, period_tax)
```

**TRAIN Law 2023 Tax Schedule:**

| Annual Taxable Income | Base Tax | Marginal Rate |
|---|---|---|
| ₱0 – ₱250,000 | ₱0 | 0% |
| ₱250,001 – ₱400,000 | ₱0 | 15% on excess of ₱250,000 |
| ₱400,001 – ₱800,000 | ₱22,500 | 20% on excess of ₱400,000 |
| ₱800,001 – ₱2,000,000 | ₱102,500 | 25% on excess of ₱800,000 |
| ₱2,000,001 – ₱8,000,000 | ₱402,500 | 30% on excess of ₱2,000,000 |
| Over ₱8,000,000 | ₱2,202,500 | 35% on excess of ₱8,000,000 |

> **Important:** These brackets are stored in `bir_tax_brackets` table, NOT hard-coded. Always query the DB.

---

### 5.5 Loan Deductions

**File:** `LoanService.php`

Active loans (`status = 'active'`) with `outstanding_balance > 0` are auto-deducted per payroll run.

```
For each active loan:
  deduction = min(monthly_amortization, outstanding_balance)
  outstanding_balance -= deduction
  if outstanding_balance <= 0: loan.status = 'paid'
  
  PayslipItem created: category='deduction_loan', code='LOAN_{type}'
  LoanPayment record created linking to payslip
```

---

## 6. Net Pay Formula

```
Net Pay = Gross Earnings
        − SSS Employee Share
        − PhilHealth Employee Share
        − Pag-IBIG Employee Share
        − Withholding Tax
        − Loan Deductions
        − Other Deductions (if any)
```

---

## 7. Payslip Item Categories

Every earning and deduction is stored as an individual `payslip_items` row:

| Category | Code Examples | Notes |
|---|---|---|
| `earning_basic` | `BASIC`, `ABSENT`, `LATE`, `UT` | Basic pay + negative adjustments |
| `earning_overtime` | `OT_REG`, `REST_DAY` | OT and rest day premiums |
| `earning_holiday` | `HOL_REG`, `HOL_SPECIAL` | Holiday premiums |
| `earning_night_diff` | `ND` | Night differential |
| `earning_allowance` | `RICE_ALLOW`, `TRANSPORT` | Allowances |
| `earning_bonus` | `13TH_MO`, `PERFORMANCE` | Bonuses |
| `deduction_statutory` | `SSS_EE`, `PHIC_EE`, `HDMF_EE`, `WT` | Government-mandated |
| `deduction_loan` | `LOAN_SSS`, `LOAN_PAGIBIG`, `LOAN_COMPANY` | Auto-deducted loan payments |
| `deduction_other` | `LATE_PEN`, `MISC_DED` | Manual deductions |

---

## 8. Employer Costs

The payroll run also tracks employer-side contributions (not deducted from employee but tracked for company budgeting):

```
Total Employer Cost = Gross Earnings
                    + SSS Employer Share
                    + SSS EC (Employees' Compensation)
                    + PhilHealth Employer Share
                    + Pag-IBIG Employer Share
```

These are stored in `payslips.sss_employer`, `sss_ec_employer`, `philhealth_employer`, `pagibig_employer`.

---

## 9. 13th Month Pay

**File:** `ThirteenthMonthService.php`

**Formula (PH Labor Code):**
```
13th Month Pay = Total Basic Salary Earned in the Calendar Year / 12
```

**Rules:**
- "Basic salary" excludes allowances, OT, holiday pay, and bonuses
- Pro-rated for new hires / resigned employees
- Paid on or before December 24
- Exempt from income tax (up to ₱90,000 per year)
- Computed from `payslip_items` where `code = 'BASIC'` for the calendar year

**Endpoint:** `GET /api/v1/payroll/thirteenth-month` (preview, before year-end run)

---

## 10. Final Pay

**File:** `FinalPayService.php`

**Components (as per DOLE Labor Advisory 06-20):**

```
Final Pay = Unpaid Salaries
          + Pro-rated 13th Month Pay
          + Cash Equivalent of Unused Leave Credits (if company policy allows encashment)
          + Return of Contributions / Refunds
          + Separation Pay (if applicable: company closure, retrenchment, etc.)
          − Outstanding Loan Balances
          − Any tax adjustments
```

**Endpoint:** `POST /api/v1/payroll/final-pay/compute`  
**Trigger:** HR Admin provides `{employee_id, separation_date, separation_reason, unused_leave_days}`

---

## 11. Compliance Reports

**File:** `ComplianceReportService.php`

| Report | Endpoint | Description |
|---|---|---|
| SSS R-3 | `GET /api/v1/payroll/reports/sss` | Monthly SSS contribution summary per employee |
| PhilHealth RF-1 | `GET /api/v1/payroll/reports/philhealth` | Monthly PhilHealth premium summary |
| Pag-IBIG MCRF | `GET /api/v1/payroll/reports/pagibig` | Monthly Pag-IBIG contribution report |
| BIR Alpha List | `GET /api/v1/payroll/reports/bir-alpha-list` | Annual withholding tax summary (BIR Form 1604-C) |

All reports accept `period_start` / `period_end` query params and can be exported to Excel.

---

## 12. Immutability Rules

Once a payroll run is `finalized`:

1. `payroll_runs.status` cannot be changed back to `draft`
2. `payslips` rows cannot be modified or deleted (soft-delete blocked at service level)
3. `payslip_items` rows are permanent
4. `loan_payments` are permanent

**Corrections after finalization:** Create an adjustment run in the next period. The adjustment run credits or debits the difference as explicit `payslip_items` with appropriate codes.

---

## 13. Money Precision Rules

All monetary arithmetic MUST use `Money::round()`:

```php
// CORRECT
$otRate = Money::round($hourly * 1.25);
$otAmount = Money::round($otRate * $hours);

// WRONG — floating point drift
$otAmount = $hourly * 1.25 * $hours;
```

`Money::round()` rounds to 4 decimal places using `PHP_ROUND_HALF_UP`.

**DB columns:** All `DECIMAL(15, 4)` — never `FLOAT` or `DOUBLE`.

---

## 14. Payroll Inputs Struct

`PayrollInputs` is a value object passed to the engine per employee:

```php
class PayrollInputs {
    public float $overtimeHours        = 0.0;
    public float $restDayHours         = 0.0;
    public float $regularHolidayHours  = 0.0;
    public float $specialHolidayHours  = 0.0;
    public float $nightDiffHours       = 0.0;
    public float $absentDays           = 0.0;
    public float $lateMinutes          = 0.0;
    public float $undertimeMinutes     = 0.0;
    public array $allowances           = [];  // [{code, label, amount, is_taxable}]
    public array $bonuses              = [];  // [{code, label, amount, is_taxable}]
    public array $otherDeductions      = [];  // [{code, label, amount}]
}
```

The HR Admin provides these values per employee when generating payroll. Future enhancement: auto-populate from `attendance_logs` for the period.

---

## 15. Statutory Table Maintenance

Statutory tables are seeded by `StatutorySeeder` and can be updated via DB admin without code changes:

| Table | When to update |
|---|---|
| `sss_contribution_brackets` | When SSS adjusts contribution schedule |
| `philhealth_brackets` | When PhilHealth changes premium rate |
| `pagibig_settings` | When Pag-IBIG adjusts rates |
| `bir_tax_brackets` | When BIR issues new tax schedule |
| `holidays` | Each year — add new Philippine holidays |

The calculators always look up the **most recent year ≤ effectiveYear** so old payrolls remain reproducible.

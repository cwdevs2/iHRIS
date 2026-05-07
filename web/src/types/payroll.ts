// Phase 4 — Payroll types. Mirror the API resource shape exactly.

import type { Pagination } from './hr';

// ─── Periods ──────────────────────────────────────────────────────────────────

export type PayrollFrequency = 'monthly' | 'semi_monthly' | 'weekly' | 'bi_weekly';
export type PayrollPeriodStatus = 'open' | 'processing' | 'closed';

export interface PayrollPeriod {
  id: string;
  name: string;
  frequency: PayrollFrequency;
  period_start: string;
  period_end: string;
  pay_date: string | null;
  working_days: number;
  status: PayrollPeriodStatus;
  remarks: string | null;
  runs_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriodListResponse {
  periods: PayrollPeriod[];
  pagination: Pagination;
}

export interface PayrollPeriodFilters {
  status?: PayrollPeriodStatus;
  frequency?: PayrollFrequency;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export type PayrollRunScope = 'company' | 'department' | 'custom';
export type PayrollRunStatus = 'draft' | 'finalized' | 'paid' | 'canceled';

export interface PayrollRunActor {
  id: string;
  name: string;
  email: string;
}

export interface PayrollRun {
  id: string;
  reference_number: string;
  payroll_period_id: string;
  period: PayrollPeriod | null;
  scope: PayrollRunScope;
  scope_filters: { department_ids?: string[]; employee_ids?: string[] } | null;
  status: PayrollRunStatus;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_employer_cost: number;
  headcount: number;
  generated_by: PayrollRunActor | null;
  generated_at: string | null;
  finalized_by: PayrollRunActor | null;
  finalized_at: string | null;
  computation_snapshot: Record<string, unknown> | null;
  notes: string | null;
  payslips?: Payslip[];
  created_at: string;
  updated_at: string;
}

export interface PayrollRunListResponse {
  runs: PayrollRun[];
  pagination: Pagination;
}

export interface PayrollRunFilters {
  status?: PayrollRunStatus;
  payroll_period_id?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

// ─── Payslips ─────────────────────────────────────────────────────────────────

export type PayslipStatus = 'draft' | 'finalized' | 'paid';

export type PayslipItemCategory =
  | 'earning_basic'
  | 'earning_overtime'
  | 'earning_holiday'
  | 'earning_night_diff'
  | 'earning_allowance'
  | 'earning_bonus'
  | 'earning_thirteenth_month'
  | 'earning_other'
  | 'deduction_statutory'
  | 'deduction_loan'
  | 'deduction_other';

export interface PayslipItem {
  id: string;
  category: PayslipItemCategory;
  code: string;
  label: string;
  quantity: number;
  rate: number;
  amount: number;
  is_taxable: boolean;
  meta: Record<string, unknown> | null;
  sort_order: number;
}

export interface PayslipEmployeeSummary {
  id: string;
  employee_number: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
  position: string | null;
}

export interface Payslip {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee: PayslipEmployeeSummary | null;
  basic_salary: number;
  daily_rate: number;
  hourly_rate: number;
  pay_frequency: string;
  regular_hours: number;
  overtime_hours: number;
  night_diff_hours: number;
  regular_holiday_hours: number;
  special_holiday_hours: number;
  rest_day_hours: number;
  absent_days: number;
  late_minutes: number;
  undertime_minutes: number;
  gross_earnings: number;
  total_deductions: number;
  taxable_income: number;
  net_pay: number;
  sss_employee: number;
  sss_employer: number;
  philhealth_employee: number;
  philhealth_employer: number;
  pagibig_employee: number;
  pagibig_employer: number;
  withholding_tax: number;
  status: PayslipStatus;
  generated_at: string | null;
  items?: PayslipItem[];
  created_at: string;
  updated_at: string;
}

export interface PayslipListResponse {
  payslips: Payslip[];
  pagination: Pagination;
}

// ─── Loans ────────────────────────────────────────────────────────────────────

export type LoanType = 'sss' | 'pagibig' | 'company' | 'salary_advance' | 'other';
export type LoanStatus = 'active' | 'paid' | 'cancelled' | 'on_hold';

export interface Loan {
  id: string;
  employee_id: string;
  employee: { id: string; employee_number: string; full_name: string | null } | null;
  type: LoanType;
  reference_number: string | null;
  principal: number;
  interest_rate: number;
  terms_months: number;
  monthly_amortization: number;
  outstanding_balance: number;
  start_date: string | null;
  end_date: string | null;
  status: LoanStatus;
  notes: string | null;
  payments_count?: number;
  created_at: string;
  updated_at: string;
}

export interface LoanListResponse {
  loans: Loan[];
  pagination: Pagination;
}

export interface LoanFilters {
  employee_id?: string;
  status?: LoanStatus;
  type?: LoanType;
  per_page?: number;
  page?: number;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ComplianceReportRow {
  [key: string]: string | number | null;
}

export interface ComplianceReportResponse {
  rows: ComplianceReportRow[];
  totals: Record<string, number>;
  meta: Record<string, unknown>;
}

export interface ThirteenthMonthRow {
  employee_id: string;
  employee_number: string;
  name: string | null;
  department: string | null;
  basic_total: number;
  thirteenth_month: number;
  taxable_excess: number;
  finalised_payslip_count: number;
}

export interface ThirteenthMonthResponse {
  year: number;
  rows: ThirteenthMonthRow[];
  totals: { thirteenth_month: number; taxable_excess: number };
}

// ─── Final pay ────────────────────────────────────────────────────────────────

export type SeparationReason =
  | 'resignation'
  | 'redundancy'
  | 'retrenchment'
  | 'closure_not_due_to_serious_losses'
  | 'disease'
  | 'installation_labor_saving_devices'
  | 'end_of_contract'
  | 'just_cause';

export interface FinalPayLine {
  code: string;
  label: string;
  amount: number;
}

export interface FinalPayComputation {
  unpaid_salary: number;
  prorated_13th_month: number;
  leave_encashment: number;
  separation_pay: number;
  additional_earnings: number;
  additional_deductions: number;
  gross_total: number;
  summary_lines: FinalPayLine[];
}

export interface FinalPayResponse {
  employee: {
    id: string;
    employee_number: string;
    name: string | null;
    date_hired: string | null;
    employment_status: string;
  };
  context: Record<string, unknown>;
  computation: FinalPayComputation;
}

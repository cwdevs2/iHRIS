import { api, unwrap } from '@/lib/api';
import type {
  JSendEnvelope,
  PayrollPeriod,
  PayrollPeriodFilters,
  PayrollPeriodListResponse,
  PayrollRun,
  PayrollRunFilters,
  PayrollRunListResponse,
  Payslip,
  PayslipListResponse,
  Loan,
  LoanFilters,
  LoanListResponse,
  ComplianceReportResponse,
  ThirteenthMonthResponse,
  FinalPayResponse,
  SeparationReason,
} from '@/types';

// ─── Periods ──────────────────────────────────────────────────────────────────

export type CreatePeriodInput = {
  name: string;
  frequency: 'monthly' | 'semi_monthly' | 'weekly' | 'bi_weekly';
  period_start: string;
  period_end: string;
  pay_date?: string | null;
  working_days?: number | null;
  status?: 'open' | 'processing' | 'closed';
  remarks?: string | null;
};
export type UpdatePeriodInput = Partial<CreatePeriodInput>;

export const payrollPeriodApi = {
  list: (filters: PayrollPeriodFilters = {}): Promise<PayrollPeriodListResponse> =>
    unwrap(api.get<JSendEnvelope<PayrollPeriodListResponse>>('/payroll/periods', { params: filters })),

  get: (id: string): Promise<{ period: PayrollPeriod }> =>
    unwrap(api.get<JSendEnvelope<{ period: PayrollPeriod }>>(`/payroll/periods/${id}`)),

  create: (data: CreatePeriodInput): Promise<{ period: PayrollPeriod }> =>
    unwrap(api.post<JSendEnvelope<{ period: PayrollPeriod }>>('/payroll/periods', data)),

  update: (id: string, data: UpdatePeriodInput): Promise<{ period: PayrollPeriod }> =>
    unwrap(api.patch<JSendEnvelope<{ period: PayrollPeriod }>>(`/payroll/periods/${id}`, data)),

  delete: (id: string): Promise<{ message: string }> =>
    unwrap(api.delete<JSendEnvelope<{ message: string }>>(`/payroll/periods/${id}`)),
};

// ─── Runs ─────────────────────────────────────────────────────────────────────

export type CreateRunInput = {
  payroll_period_id: string;
  scope?: 'company' | 'department' | 'custom';
  scope_filters?: { department_ids?: string[]; employee_ids?: string[] };
  notes?: string | null;
};

export type GenerateInputsRow = {
  regular_hours?: number;
  overtime_hours?: number;
  rest_day_hours?: number;
  regular_holiday_hours?: number;
  special_holiday_hours?: number;
  night_diff_hours?: number;
  absent_days?: number;
  late_minutes?: number;
  undertime_minutes?: number;
  allowances?: Array<{ code: string; label: string; amount: number; is_taxable?: boolean }>;
  bonuses?: Array<{ code: string; label: string; amount: number; is_taxable?: boolean }>;
  other_deductions?: Array<{ code: string; label: string; amount: number }>;
};

export type GenerateInput = {
  effective_year?: number;
  inputs?: Record<string, GenerateInputsRow>;
};

export const payrollRunApi = {
  list: (filters: PayrollRunFilters = {}): Promise<PayrollRunListResponse> =>
    unwrap(api.get<JSendEnvelope<PayrollRunListResponse>>('/payroll/runs', { params: filters })),

  get: (id: string): Promise<{ run: PayrollRun }> =>
    unwrap(api.get<JSendEnvelope<{ run: PayrollRun }>>(`/payroll/runs/${id}`)),

  create: (data: CreateRunInput): Promise<{ run: PayrollRun }> =>
    unwrap(api.post<JSendEnvelope<{ run: PayrollRun }>>('/payroll/runs', data)),

  generate: (id: string, data: GenerateInput): Promise<{ run: PayrollRun }> =>
    unwrap(api.post<JSendEnvelope<{ run: PayrollRun }>>(`/payroll/runs/${id}/generate`, data)),

  finalize: (id: string): Promise<{ run: PayrollRun }> =>
    unwrap(api.patch<JSendEnvelope<{ run: PayrollRun }>>(`/payroll/runs/${id}/finalize`)),

  markPaid: (id: string): Promise<{ run: PayrollRun }> =>
    unwrap(api.patch<JSendEnvelope<{ run: PayrollRun }>>(`/payroll/runs/${id}/mark-paid`)),

  cancel: (id: string): Promise<{ run: PayrollRun }> =>
    unwrap(api.patch<JSendEnvelope<{ run: PayrollRun }>>(`/payroll/runs/${id}/cancel`)),
};

// ─── Payslips ─────────────────────────────────────────────────────────────────

export const payslipApi = {
  list: (params: { payroll_run_id?: string; employee_id?: string; status?: string; per_page?: number; page?: number } = {}): Promise<PayslipListResponse> =>
    unwrap(api.get<JSendEnvelope<PayslipListResponse>>('/payroll/payslips', { params })),

  own: (): Promise<{ payslips: Payslip[] }> =>
    unwrap(api.get<JSendEnvelope<{ payslips: Payslip[] }>>('/payroll/payslips/own')),

  get: (id: string): Promise<{ payslip: Payslip }> =>
    unwrap(api.get<JSendEnvelope<{ payslip: Payslip }>>(`/payroll/payslips/${id}`)),

  documentUrl: (id: string): string =>
    `${api.defaults.baseURL}/payroll/payslips/${id}/document`,
};

// ─── Loans ────────────────────────────────────────────────────────────────────

export type CreateLoanInput = {
  employee_id: string;
  type: 'sss' | 'pagibig' | 'company' | 'salary_advance' | 'other';
  reference_number?: string | null;
  principal: number;
  interest_rate?: number | null;
  terms_months: number;
  monthly_amortization?: number | null;
  start_date: string;
  end_date: string;
  status?: 'active' | 'paid' | 'cancelled' | 'on_hold';
  notes?: string | null;
};
export type UpdateLoanInput = Partial<Omit<CreateLoanInput, 'employee_id' | 'principal' | 'terms_months' | 'start_date' | 'end_date' | 'type'>>;

export const loanApi = {
  list: (filters: LoanFilters = {}): Promise<LoanListResponse> =>
    unwrap(api.get<JSendEnvelope<LoanListResponse>>('/payroll/loans', { params: filters })),

  get: (id: string): Promise<{ loan: Loan }> =>
    unwrap(api.get<JSendEnvelope<{ loan: Loan }>>(`/payroll/loans/${id}`)),

  create: (data: CreateLoanInput): Promise<{ loan: Loan }> =>
    unwrap(api.post<JSendEnvelope<{ loan: Loan }>>('/payroll/loans', data)),

  update: (id: string, data: UpdateLoanInput): Promise<{ loan: Loan }> =>
    unwrap(api.patch<JSendEnvelope<{ loan: Loan }>>(`/payroll/loans/${id}`, data)),
};

// ─── Compliance reports ──────────────────────────────────────────────────────

export const complianceApi = {
  sss: (params: { date_from: string; date_to: string }): Promise<ComplianceReportResponse> =>
    unwrap(api.get<JSendEnvelope<ComplianceReportResponse>>('/payroll/reports/sss', { params })),

  philhealth: (params: { date_from: string; date_to: string }): Promise<ComplianceReportResponse> =>
    unwrap(api.get<JSendEnvelope<ComplianceReportResponse>>('/payroll/reports/philhealth', { params })),

  pagibig: (params: { date_from: string; date_to: string }): Promise<ComplianceReportResponse> =>
    unwrap(api.get<JSendEnvelope<ComplianceReportResponse>>('/payroll/reports/pagibig', { params })),

  birAlphaList: (params: { year: number }): Promise<ComplianceReportResponse> =>
    unwrap(api.get<JSendEnvelope<ComplianceReportResponse>>('/payroll/reports/bir-alpha-list', { params })),
};

export const thirteenthMonthApi = {
  index: (year: number): Promise<ThirteenthMonthResponse> =>
    unwrap(api.get<JSendEnvelope<ThirteenthMonthResponse>>('/payroll/thirteenth-month', { params: { year } })),
};

export type FinalPayInput = {
  employee_id: string;
  last_day_worked: string;
  unpaid_days: number;
  unused_leave_days?: number;
  separation_reason: SeparationReason;
  additional_earnings?: Array<{ code: string; label: string; amount: number }>;
  additional_deductions?: Array<{ code: string; label: string; amount: number }>;
};

export const finalPayApi = {
  compute: (data: FinalPayInput): Promise<FinalPayResponse> =>
    unwrap(api.post<JSendEnvelope<FinalPayResponse>>('/payroll/final-pay/compute', data)),
};

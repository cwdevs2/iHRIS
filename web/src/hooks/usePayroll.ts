import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  payrollPeriodApi,
  payrollRunApi,
  payslipApi,
  loanApi,
  complianceApi,
  thirteenthMonthApi,
  finalPayApi,
  type CreatePeriodInput,
  type UpdatePeriodInput,
  type CreateRunInput,
  type GenerateInput,
  type CreateLoanInput,
  type UpdateLoanInput,
  type FinalPayInput,
} from '@/api/payroll';
import type {
  PayrollPeriodFilters,
  PayrollRunFilters,
  LoanFilters,
} from '@/types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const payrollKeys = {
  periods: {
    all: ['payroll', 'periods'] as const,
    list: (filters: PayrollPeriodFilters) => [...payrollKeys.periods.all, 'list', filters] as const,
    detail: (id: string) => [...payrollKeys.periods.all, 'detail', id] as const,
  },
  runs: {
    all: ['payroll', 'runs'] as const,
    list: (filters: PayrollRunFilters) => [...payrollKeys.runs.all, 'list', filters] as const,
    detail: (id: string) => [...payrollKeys.runs.all, 'detail', id] as const,
  },
  payslips: {
    all: ['payroll', 'payslips'] as const,
    list: (filters: object) => [...payrollKeys.payslips.all, 'list', filters] as const,
    own: () => [...payrollKeys.payslips.all, 'own'] as const,
    detail: (id: string) => [...payrollKeys.payslips.all, 'detail', id] as const,
  },
  loans: {
    all: ['payroll', 'loans'] as const,
    list: (filters: LoanFilters) => [...payrollKeys.loans.all, 'list', filters] as const,
    detail: (id: string) => [...payrollKeys.loans.all, 'detail', id] as const,
  },
  reports: {
    sss: (params: object) => ['payroll', 'reports', 'sss', params] as const,
    philhealth: (params: object) => ['payroll', 'reports', 'philhealth', params] as const,
    pagibig: (params: object) => ['payroll', 'reports', 'pagibig', params] as const,
    bir: (year: number) => ['payroll', 'reports', 'bir', year] as const,
    thirteenth: (year: number) => ['payroll', 'reports', 'thirteenth', year] as const,
  },
};

// ─── Periods ──────────────────────────────────────────────────────────────────

export function usePayrollPeriods(filters: PayrollPeriodFilters = {}) {
  return useQuery({
    queryKey: payrollKeys.periods.list(filters),
    queryFn: () => payrollPeriodApi.list(filters),
  });
}

export function usePayrollPeriod(id: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.periods.detail(id ?? ''),
    queryFn: () => payrollPeriodApi.get(id!),
    enabled: !!id,
  });
}

export function useCreatePayrollPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePeriodInput) => payrollPeriodApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.periods.all });
      toast.success('Payroll period created.');
    },
    onError: () => toast.error('Failed to create period.'),
  });
}

export function useUpdatePayrollPeriod(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePeriodInput) => payrollPeriodApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.periods.all });
      toast.success('Period updated.');
    },
    onError: () => toast.error('Failed to update period.'),
  });
}

export function useDeletePayrollPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollPeriodApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.periods.all });
      toast.success('Period deleted.');
    },
    onError: () => toast.error('Failed to delete period.'),
  });
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export function usePayrollRuns(filters: PayrollRunFilters = {}) {
  return useQuery({
    queryKey: payrollKeys.runs.list(filters),
    queryFn: () => payrollRunApi.list(filters),
  });
}

export function usePayrollRun(id: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.runs.detail(id ?? ''),
    queryFn: () => payrollRunApi.get(id!),
    enabled: !!id,
  });
}

export function useCreatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRunInput) => payrollRunApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.runs.all });
      toast.success('Payroll run created.');
    },
    onError: () => toast.error('Failed to create run.'),
  });
}

export function useGeneratePayslips(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateInput) => payrollRunApi.generate(runId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.runs.detail(runId) });
      qc.invalidateQueries({ queryKey: payrollKeys.runs.all });
      toast.success('Payslips generated.');
    },
    onError: () => toast.error('Failed to generate payslips.'),
  });
}

export function useFinalizePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.finalize(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: payrollKeys.runs.detail(id) });
      qc.invalidateQueries({ queryKey: payrollKeys.runs.all });
      toast.success('Run finalized.');
    },
    onError: () => toast.error('Failed to finalize run.'),
  });
}

export function useMarkRunPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.markPaid(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: payrollKeys.runs.detail(id) });
      qc.invalidateQueries({ queryKey: payrollKeys.runs.all });
      toast.success('Run marked as paid.');
    },
    onError: () => toast.error('Failed to mark run as paid.'),
  });
}

export function useCancelRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollRunApi.cancel(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: payrollKeys.runs.detail(id) });
      qc.invalidateQueries({ queryKey: payrollKeys.runs.all });
      toast.success('Run canceled.');
    },
    onError: () => toast.error('Failed to cancel run.'),
  });
}

// ─── Payslips ─────────────────────────────────────────────────────────────────

export function useOwnPayslips() {
  return useQuery({
    queryKey: payrollKeys.payslips.own(),
    queryFn: () => payslipApi.own(),
  });
}

export function usePayslip(id: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.payslips.detail(id ?? ''),
    queryFn: () => payslipApi.get(id!),
    enabled: !!id,
  });
}

// ─── Loans ────────────────────────────────────────────────────────────────────

export function useLoans(filters: LoanFilters = {}) {
  return useQuery({
    queryKey: payrollKeys.loans.list(filters),
    queryFn: () => loanApi.list(filters),
  });
}

export function useLoan(id: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.loans.detail(id ?? ''),
    queryFn: () => loanApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLoanInput) => loanApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.loans.all });
      toast.success('Loan created.');
    },
    onError: () => toast.error('Failed to create loan.'),
  });
}

export function useUpdateLoan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateLoanInput) => loanApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payrollKeys.loans.all });
      qc.invalidateQueries({ queryKey: payrollKeys.loans.detail(id) });
      toast.success('Loan updated.');
    },
    onError: () => toast.error('Failed to update loan.'),
  });
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export function useSssReport(params: { date_from: string; date_to: string } | null) {
  return useQuery({
    queryKey: payrollKeys.reports.sss(params ?? {}),
    queryFn: () => complianceApi.sss(params!),
    enabled: !!params,
  });
}

export function usePhilhealthReport(params: { date_from: string; date_to: string } | null) {
  return useQuery({
    queryKey: payrollKeys.reports.philhealth(params ?? {}),
    queryFn: () => complianceApi.philhealth(params!),
    enabled: !!params,
  });
}

export function usePagibigReport(params: { date_from: string; date_to: string } | null) {
  return useQuery({
    queryKey: payrollKeys.reports.pagibig(params ?? {}),
    queryFn: () => complianceApi.pagibig(params!),
    enabled: !!params,
  });
}

export function useBirAlphaList(year: number | null) {
  return useQuery({
    queryKey: payrollKeys.reports.bir(year ?? 0),
    queryFn: () => complianceApi.birAlphaList({ year: year! }),
    enabled: !!year,
  });
}

export function useThirteenthMonth(year: number | null) {
  return useQuery({
    queryKey: payrollKeys.reports.thirteenth(year ?? 0),
    queryFn: () => thirteenthMonthApi.index(year!),
    enabled: !!year,
  });
}

export function useComputeFinalPay() {
  return useMutation({
    mutationFn: (data: FinalPayInput) => finalPayApi.compute(data),
    onSuccess: () => toast.success('Final pay computed.'),
    onError: () => toast.error('Failed to compute final pay.'),
  });
}

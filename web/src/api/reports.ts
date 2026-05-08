import { api, unwrap, tokenStorage } from '@/lib/api';
import type {
  JSendEnvelope,
  ExecutiveSummary,
  EmployeeReport,
  AttendanceReport,
  LeaveReport,
  PayrollRegisterReport,
  RecruitmentReport,
  PerformanceReport,
  ReportType,
} from '@/types';

const dateRangeParams = (from?: string, to?: string) => ({
  ...(from ? { date_from: from } : {}),
  ...(to ? { date_to: to } : {}),
});

export const reportsApi = {
  summary: (): Promise<ExecutiveSummary> =>
    unwrap(api.get<JSendEnvelope<ExecutiveSummary>>('/reports/summary')),

  employees: (from?: string, to?: string): Promise<EmployeeReport> =>
    unwrap(api.get<JSendEnvelope<EmployeeReport>>('/reports/employees', { params: dateRangeParams(from, to) })),

  attendance: (from: string, to: string): Promise<AttendanceReport> =>
    unwrap(api.get<JSendEnvelope<AttendanceReport>>('/reports/attendance', { params: { date_from: from, date_to: to } })),

  leaves: (from: string, to: string): Promise<LeaveReport> =>
    unwrap(api.get<JSendEnvelope<LeaveReport>>('/reports/leaves', { params: { date_from: from, date_to: to } })),

  payrollRegister: (from: string, to: string): Promise<PayrollRegisterReport> =>
    unwrap(api.get<JSendEnvelope<PayrollRegisterReport>>('/reports/payroll-register', { params: { date_from: from, date_to: to } })),

  recruitment: (from?: string, to?: string): Promise<RecruitmentReport> =>
    unwrap(api.get<JSendEnvelope<RecruitmentReport>>('/reports/recruitment', { params: dateRangeParams(from, to) })),

  performance: (): Promise<PerformanceReport> =>
    unwrap(api.get<JSendEnvelope<PerformanceReport>>('/reports/performance')),

  /**
   * Triggers a CSV download. Bypasses the JSend unwrap because the response is a binary stream.
   */
  exportCsv: async (type: ReportType, from?: string, to?: string): Promise<void> => {
    const baseURL = api.defaults.baseURL ?? '';
    const url = new URL(`${baseURL}/reports/${type}/export`);
    url.searchParams.set('format', 'csv');
    if (from) url.searchParams.set('date_from', from);
    if (to) url.searchParams.set('date_to', to);

    const token = tokenStorage.get();
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'text/csv',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed (${response.status})`);
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
    link.download = `report-${type}-${ts}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  },
};

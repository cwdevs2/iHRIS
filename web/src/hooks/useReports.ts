import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reportsApi } from '@/api/reports';
import type { ReportType } from '@/types';

export const reportKeys = {
  all: ['reports'] as const,
  summary: () => [...reportKeys.all, 'summary'] as const,
  employees: (from?: string, to?: string) => [...reportKeys.all, 'employees', from ?? null, to ?? null] as const,
  attendance: (from: string, to: string) => [...reportKeys.all, 'attendance', from, to] as const,
  leaves: (from: string, to: string) => [...reportKeys.all, 'leaves', from, to] as const,
  payroll: (from: string, to: string) => [...reportKeys.all, 'payroll', from, to] as const,
  recruitment: (from?: string, to?: string) => [...reportKeys.all, 'recruitment', from ?? null, to ?? null] as const,
  performance: () => [...reportKeys.all, 'performance'] as const,
};

export function useExecutiveSummary() {
  return useQuery({
    queryKey: reportKeys.summary(),
    queryFn: () => reportsApi.summary(),
    refetchInterval: 60_000,
  });
}

export function useEmployeeReport(from?: string, to?: string) {
  return useQuery({
    queryKey: reportKeys.employees(from, to),
    queryFn: () => reportsApi.employees(from, to),
  });
}

export function useAttendanceReport(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.attendance(from, to),
    queryFn: () => reportsApi.attendance(from, to),
    enabled: enabled && !!from && !!to,
  });
}

export function useLeaveReport(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.leaves(from, to),
    queryFn: () => reportsApi.leaves(from, to),
    enabled: enabled && !!from && !!to,
  });
}

export function usePayrollRegisterReport(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.payroll(from, to),
    queryFn: () => reportsApi.payrollRegister(from, to),
    enabled: enabled && !!from && !!to,
  });
}

export function useRecruitmentReport(from?: string, to?: string) {
  return useQuery({
    queryKey: reportKeys.recruitment(from, to),
    queryFn: () => reportsApi.recruitment(from, to),
  });
}

export function usePerformanceReport() {
  return useQuery({
    queryKey: reportKeys.performance(),
    queryFn: () => reportsApi.performance(),
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: ({ type, from, to }: { type: ReportType; from?: string; to?: string }) =>
      reportsApi.exportCsv(type, from, to),
    onSuccess: () => toast.success('Report downloaded.'),
    onError: () => toast.error('Failed to export report.'),
  });
}

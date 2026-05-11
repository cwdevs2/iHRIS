import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  adminAttendanceApi,
  type AdminAttendanceFilters,
  type CorrectionFilters,
  type ManualEntryInput,
} from '@/api/adminAttendance';

export const adminAttendanceKeys = {
  all: ['admin', 'attendance'] as const,
  list: (f: AdminAttendanceFilters) => [...adminAttendanceKeys.all, 'list', f] as const,
  corrections: (f: CorrectionFilters) => [...adminAttendanceKeys.all, 'corrections', f] as const,
};

export function useAdminAttendance(filters: AdminAttendanceFilters = {}) {
  return useQuery({
    queryKey: adminAttendanceKeys.list(filters),
    queryFn: () => adminAttendanceApi.list(filters),
  });
}

export function useAdminCorrections(filters: CorrectionFilters = {}) {
  return useQuery({
    queryKey: adminAttendanceKeys.corrections(filters),
    queryFn: () => adminAttendanceApi.listCorrections(filters),
  });
}

export function useManualAttendanceEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ManualEntryInput) => adminAttendanceApi.manual(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAttendanceKeys.all });
      toast.success('Attendance record saved.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save attendance.'),
  });
}

export function useApproveCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      adminAttendanceApi.approveCorrection(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAttendanceKeys.all });
      toast.success('Correction approved and applied.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to approve.'),
  });
}

export function useRejectCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      adminAttendanceApi.rejectCorrection(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAttendanceKeys.all });
      toast.success('Correction rejected.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reject.'),
  });
}

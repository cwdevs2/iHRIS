import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  essAttendanceApi,
  essLeaveApi,
  essProfileApi,
  type AttendanceFilters,
  type ClockInInput,
  type ClockOutInput,
  type FileCorrectionInput,
  type LeaveFilters,
  type FileLeaveInput,
  type ProfileUpdateInput,
} from '@/api/ess';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const essKeys = {
  attendance: {
    all: ['ess', 'attendance'] as const,
    list: (filters: AttendanceFilters) => [...essKeys.attendance.all, 'list', filters] as const,
    today: () => [...essKeys.attendance.all, 'today'] as const,
    corrections: () => [...essKeys.attendance.all, 'corrections'] as const,
  },
  leave: {
    all: ['ess', 'leave'] as const,
    types: () => [...essKeys.leave.all, 'types'] as const,
    balances: (year?: number) => [...essKeys.leave.all, 'balances', year] as const,
    list: (filters: LeaveFilters) => [...essKeys.leave.all, 'list', filters] as const,
  },
  profile: {
    all: ['ess', 'profile'] as const,
    me: () => [...essKeys.profile.all, 'me'] as const,
    updateRequests: () => [...essKeys.profile.all, 'update-requests'] as const,
  },
};

// ─── Attendance hooks ─────────────────────────────────────────────────────────

export function useMyAttendance(filters: AttendanceFilters = {}) {
  return useQuery({
    queryKey: essKeys.attendance.list(filters),
    queryFn: () => essAttendanceApi.list(filters),
  });
}

export function useTodayAttendance() {
  return useQuery({
    queryKey: essKeys.attendance.today(),
    queryFn: () => essAttendanceApi.today(),
    refetchInterval: 60_000, // refresh every minute
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClockInInput) => essAttendanceApi.clockIn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.attendance.all });
      toast.success('Clocked in successfully.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to clock in.'),
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClockOutInput) => essAttendanceApi.clockOut(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.attendance.all });
      toast.success('Clocked out successfully.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to clock out.'),
  });
}

export function useMyCorrections() {
  return useQuery({
    queryKey: essKeys.attendance.corrections(),
    queryFn: () => essAttendanceApi.listCorrections(),
  });
}

export function useFileCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FileCorrectionInput) => essAttendanceApi.fileCorrection(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.attendance.corrections() });
      toast.success('Correction request submitted.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to submit correction.'),
  });
}

// ─── Leave hooks ──────────────────────────────────────────────────────────────

export function useLeaveTypes() {
  return useQuery({
    queryKey: essKeys.leave.types(),
    queryFn: () => essLeaveApi.types(),
    staleTime: Infinity, // leave types rarely change
  });
}

export function useMyLeaveBalances(year?: number) {
  return useQuery({
    queryKey: essKeys.leave.balances(year),
    queryFn: () => essLeaveApi.balances(year),
  });
}

export function useMyLeaveRequests(filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: essKeys.leave.list(filters),
    queryFn: () => essLeaveApi.list(filters),
  });
}

export function useFileLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FileLeaveInput) => essLeaveApi.file(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.leave.all });
      toast.success('Leave request filed.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to file leave.'),
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => essLeaveApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.leave.all });
      toast.success('Leave request cancelled.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to cancel.'),
  });
}

// ─── Profile hooks ────────────────────────────────────────────────────────────

export function useMyProfile() {
  return useQuery({
    queryKey: essKeys.profile.me(),
    queryFn: () => essProfileApi.get(),
  });
}

export function useMyProfileUpdateRequests() {
  return useQuery({
    queryKey: essKeys.profile.updateRequests(),
    queryFn: () => essProfileApi.updateRequests(),
  });
}

export function useRequestProfileUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProfileUpdateInput) => essProfileApi.requestUpdate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: essKeys.profile.all });
      toast.success('Profile update request submitted. HR will review it shortly.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to submit request.'),
  });
}

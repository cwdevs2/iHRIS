import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  adminLeaveApi,
  type AdminLeaveFilters,
  type CreateLeaveTypeInput,
} from '@/api/adminLeave';

export const adminLeaveKeys = {
  all: ['admin', 'leave'] as const,
  list: (f: AdminLeaveFilters) => [...adminLeaveKeys.all, 'list', f] as const,
  types: () => [...adminLeaveKeys.all, 'types'] as const,
  balances: (empId: string, year?: number) => [...adminLeaveKeys.all, 'balances', empId, year] as const,
};

export function useAdminLeaveRequests(filters: AdminLeaveFilters = {}) {
  return useQuery({
    queryKey: adminLeaveKeys.list(filters),
    queryFn: () => adminLeaveApi.list(filters),
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      adminLeaveApi.approve(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminLeaveKeys.all });
      toast.success('Leave request approved.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to approve.'),
  });
}

export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      adminLeaveApi.reject(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminLeaveKeys.all });
      toast.success('Leave request rejected.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reject.'),
  });
}

export function useAdminLeaveTypes() {
  return useQuery({
    queryKey: adminLeaveKeys.types(),
    queryFn: () => adminLeaveApi.types(),
    staleTime: 60_000,
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeaveTypeInput) => adminLeaveApi.createType(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminLeaveKeys.types() });
      toast.success('Leave type created.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create leave type.'),
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLeaveTypeInput & { is_active: boolean }> }) =>
      adminLeaveApi.updateType(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminLeaveKeys.types() });
      toast.success('Leave type updated.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update.'),
  });
}

export function useEmployeeLeaveBalances(employeeId: string, year?: number) {
  return useQuery({
    queryKey: adminLeaveKeys.balances(employeeId, year),
    queryFn: () => adminLeaveApi.balances(employeeId, year),
    enabled: !!employeeId,
  });
}

export function useAdjustLeaveBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, credits, reason }: { id: string; credits: number; reason?: string }) =>
      adminLeaveApi.adjustBalance(id, credits, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminLeaveKeys.all });
      toast.success('Leave balance updated.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to adjust balance.'),
  });
}

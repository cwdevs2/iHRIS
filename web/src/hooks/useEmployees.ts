import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { employeeApi, type CreateEmployeeInput, type UpdateEmployeeInput } from '@/api/hr';
import type { EmployeeFilters } from '@/types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: EmployeeFilters) => [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => employeeApi.list(filters),
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: employeeKeys.detail(id ?? ''),
    queryFn: () => employeeApi.get(id!),
    enabled: !!id,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateEmployee() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeInput) => employeeApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success('Employee added successfully.');
    },
    onError: () => toast.error('Failed to create employee.'),
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEmployeeInput) => employeeApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.lists() });
      qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      toast.success('Employee updated.');
    },
    onError: () => toast.error('Failed to update employee.'),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success('Employee archived.');
    },
    onError: () => toast.error('Failed to archive employee.'),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { departmentApi, positionApi, type CreateDepartmentInput, type UpdateDepartmentInput, type CreatePositionInput, type UpdatePositionInput } from '@/api/hr';

// ─── Department Keys ──────────────────────────────────────────────────────────

export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  list: (params?: object) => [...departmentKeys.lists(), params] as const,
  detail: (id: string) => [...departmentKeys.all, 'detail', id] as const,
};

export function useDepartments(params?: { all?: boolean; search?: string; per_page?: number; page?: number }) {
  return useQuery({
    queryKey: departmentKeys.list(params),
    queryFn: () => departmentApi.list(params),
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: departmentKeys.detail(id ?? ''),
    queryFn: () => departmentApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentInput) => departmentApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: departmentKeys.lists() }); toast.success('Department created.'); },
    onError: () => toast.error('Failed to create department.'),
  });
}

export function useUpdateDepartment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDepartmentInput) => departmentApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: departmentKeys.lists() });
      qc.invalidateQueries({ queryKey: departmentKeys.detail(id) });
      toast.success('Department updated.');
    },
    onError: () => toast.error('Failed to update department.'),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => departmentApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: departmentKeys.lists() }); toast.success('Department archived.'); },
    onError: (err: Error) => toast.error(err.message || 'Failed to archive department.'),
  });
}

// ─── Position Keys ────────────────────────────────────────────────────────────

export const positionKeys = {
  all: ['positions'] as const,
  lists: () => [...positionKeys.all, 'list'] as const,
  list: (params?: object) => [...positionKeys.lists(), params] as const,
  detail: (id: string) => [...positionKeys.all, 'detail', id] as const,
};

export function usePositions(params?: { all?: boolean; department_id?: string; search?: string; per_page?: number; page?: number }) {
  return useQuery({
    queryKey: positionKeys.list(params),
    queryFn: () => positionApi.list(params),
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePositionInput) => positionApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: positionKeys.lists() }); toast.success('Position created.'); },
    onError: () => toast.error('Failed to create position.'),
  });
}

export function useUpdatePosition(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePositionInput) => positionApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: positionKeys.lists() });
      qc.invalidateQueries({ queryKey: positionKeys.detail(id) });
      toast.success('Position updated.');
    },
    onError: () => toast.error('Failed to update position.'),
  });
}

export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => positionApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: positionKeys.lists() }); toast.success('Position archived.'); },
    onError: (err: Error) => toast.error(err.message || 'Failed to archive position.'),
  });
}

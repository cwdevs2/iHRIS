import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  userGroupApi,
  type CreateUserGroupInput,
  type UpdateUserGroupInput,
} from '@/api/userGroups';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const userGroupKeys = {
  all: ['user-groups'] as const,
  lists: () => [...userGroupKeys.all, 'list'] as const,
  list: (params?: object) => [...userGroupKeys.lists(), params] as const,
  detail: (id: string) => [...userGroupKeys.all, 'detail', id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useUserGroups(params?: {
  all?: boolean;
  search?: string;
  type?: string;
  is_active?: boolean;
  department_id?: string;
  per_page?: number;
  page?: number;
}) {
  return useQuery({
    queryKey: userGroupKeys.list(params),
    queryFn: () => userGroupApi.list(params),
  });
}

export function useUserGroup(id: string | undefined) {
  return useQuery({
    queryKey: userGroupKeys.detail(id ?? ''),
    queryFn: () => userGroupApi.get(id!),
    enabled: !!id,
    select: (data) => data.group,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateUserGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserGroupInput) => userGroupApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userGroupKeys.lists() });
      toast.success('User group created.');
    },
    onError: () => toast.error('Failed to create user group.'),
  });
}

export function useUpdateUserGroup(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserGroupInput) => userGroupApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userGroupKeys.lists() });
      qc.invalidateQueries({ queryKey: userGroupKeys.detail(id) });
      toast.success('User group updated.');
    },
    onError: () => toast.error('Failed to update user group.'),
  });
}

export function useDeleteUserGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userGroupApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userGroupKeys.lists() });
      toast.success('User group archived.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to archive user group.'),
  });
}

export function useAddGroupMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => userGroupApi.addMember(groupId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userGroupKeys.detail(groupId) });
      qc.invalidateQueries({ queryKey: userGroupKeys.lists() });
      toast.success('Member added to group.');
    },
    onError: () => toast.error('Failed to add member.'),
  });
}

export function useRemoveGroupMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => userGroupApi.removeMember(groupId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userGroupKeys.detail(groupId) });
      qc.invalidateQueries({ queryKey: userGroupKeys.lists() });
      toast.success('Member removed from group.');
    },
    onError: () => toast.error('Failed to remove member.'),
  });
}

export function useAssignGroupDirector(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => userGroupApi.assignDirector(groupId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userGroupKeys.detail(groupId) });
      qc.invalidateQueries({ queryKey: userGroupKeys.lists() });
      toast.success('Director assigned.');
    },
    onError: () => toast.error('Failed to assign director.'),
  });
}

export function useRemoveGroupDirector(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => userGroupApi.removeDirector(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userGroupKeys.detail(groupId) });
      qc.invalidateQueries({ queryKey: userGroupKeys.lists() });
      toast.success('Director removed.');
    },
    onError: () => toast.error('Failed to remove director.'),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, unwrap } from '@/lib/api';
import type { JSendEnvelope } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnboardingTask {
  id: string;
  checklist_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_required: boolean;
  assigned_role: string | null;
  due_days: number | null;
}

export interface OnboardingChecklist {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  tasks_count?: number;
  tasks: OnboardingTask[];
  created_at: string;
  updated_at: string;
}

export interface OnboardingTaskCompletion {
  id: string;
  assignment_id: string;
  task_id: string;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface OnboardingAssignment {
  id: string;
  employee_id: string;
  checklist_id: string;
  assigned_by: string | null;
  start_date: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  completed_at: string | null;
  checklist: Pick<OnboardingChecklist, 'id' | 'name' | 'tasks'> | null;
  task_completions: OnboardingTaskCompletion[];
  employee: { id: string; employee_number: string; user: { id: string; first_name: string; last_name: string } | null } | null;
  created_at: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

const onboardingApi = {
  checklists: () => unwrap(api.get<JSendEnvelope<{ checklists: OnboardingChecklist[] }>>('/onboarding/checklists')),
  createChecklist: (data: { name: string; description?: string; tasks?: Partial<OnboardingTask>[] }) =>
    unwrap(api.post<JSendEnvelope<{ checklist: OnboardingChecklist }>>('/onboarding/checklists', data)),
  deleteChecklist: (id: string) =>
    unwrap(api.delete<JSendEnvelope<{ message: string }>>(`/onboarding/checklists/${id}`)),

  assignments: (params?: { employee_id?: string; status?: string }) =>
    unwrap(api.get<JSendEnvelope<{ assignments: OnboardingAssignment[] }>>('/onboarding/assignments', { params })),
  assign: (data: { employee_id: string; checklist_id: string; start_date?: string }) =>
    unwrap(api.post<JSendEnvelope<{ assignment: OnboardingAssignment }>>('/onboarding/assignments', data)),
  completeTask: (assignmentId: string, taskId: string, notes?: string) =>
    unwrap(api.patch<JSendEnvelope<{ assignment: OnboardingAssignment }>>(`/onboarding/assignments/${assignmentId}/tasks/${taskId}`, { notes })),
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

const keys = {
  checklists: ['onboarding', 'checklists'] as const,
  assignments: (params?: object) => ['onboarding', 'assignments', params] as const,
};

export function useOnboardingChecklists() {
  return useQuery({ queryKey: keys.checklists, queryFn: onboardingApi.checklists, staleTime: 60_000 });
}

export function useOnboardingAssignments(params?: { employee_id?: string; status?: string }) {
  return useQuery({ queryKey: keys.assignments(params), queryFn: () => onboardingApi.assignments(params) });
}

export function useCreateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: onboardingApi.createChecklist,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: keys.checklists }); toast.success('Checklist created.'); },
    onError: () => toast.error('Failed to create checklist.'),
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: onboardingApi.deleteChecklist,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: keys.checklists }); toast.success('Checklist deleted.'); },
    onError: () => toast.error('Failed to delete.'),
  });
}

export function useAssignOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: onboardingApi.assign,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['onboarding', 'assignments'] }); toast.success('Onboarding assigned.'); },
    onError: () => toast.error('Assignment failed.'),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, taskId, notes }: { assignmentId: string; taskId: string; notes?: string }) =>
      onboardingApi.completeTask(assignmentId, taskId, notes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['onboarding', 'assignments'] });
      toast.success('Task updated.');
    },
    onError: () => toast.error('Failed to update task.'),
  });
}

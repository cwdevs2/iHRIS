import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cycleApi, goalApi, reviewApi, performanceAnalyticsApi } from '@/api/performance';
import type {
  CycleFilters,
  GoalFilters,
  ReviewFilters,
  CreateCyclePayload,
  CreateGoalPayload,
  SubmitReviewPayload,
} from '@/types';

// ── Query Keys ────────────────────────────────────────────────────────────────

export const performanceKeys = {
  cycles: {
    all: ['perf-cycles'] as const,
    lists: () => [...performanceKeys.cycles.all, 'list'] as const,
    list: (f: CycleFilters) => [...performanceKeys.cycles.lists(), f] as const,
    detail: (id: string) => [...performanceKeys.cycles.all, 'detail', id] as const,
  },
  goals: {
    all: ['perf-goals'] as const,
    lists: () => [...performanceKeys.goals.all, 'list'] as const,
    list: (f: GoalFilters) => [...performanceKeys.goals.lists(), f] as const,
  },
  reviews: {
    all: ['perf-reviews'] as const,
    lists: () => [...performanceKeys.reviews.all, 'list'] as const,
    list: (f: ReviewFilters) => [...performanceKeys.reviews.lists(), f] as const,
    detail: (id: string) => [...performanceKeys.reviews.all, 'detail', id] as const,
  },
  analytics: (cycleId?: string) => ['perf-analytics', cycleId] as const,
};

// ── Cycles ────────────────────────────────────────────────────────────────────

export function useCycles(filters: CycleFilters = {}) {
  return useQuery({
    queryKey: performanceKeys.cycles.list(filters),
    queryFn: () => cycleApi.list(filters),
  });
}

export function useCycle(id: string | undefined) {
  return useQuery({
    queryKey: performanceKeys.cycles.detail(id ?? ''),
    queryFn: () => cycleApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCyclePayload) => cycleApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.cycles.lists() });
      toast.success('Review cycle created.');
    },
    onError: () => toast.error('Failed to create cycle.'),
  });
}

export function useUpdateCycle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateCyclePayload>) => cycleApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.cycles.lists() });
      qc.invalidateQueries({ queryKey: performanceKeys.cycles.detail(id) });
      toast.success('Cycle updated.');
    },
    onError: () => toast.error('Failed to update cycle.'),
  });
}

export function useActivateCycle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cycleApi.activate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.cycles.lists() });
      qc.invalidateQueries({ queryKey: performanceKeys.cycles.detail(id) });
      toast.success('Review cycle activated.');
    },
    onError: () => toast.error('Failed to activate cycle.'),
  });
}

export function useCloseCycle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cycleApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.cycles.lists() });
      qc.invalidateQueries({ queryKey: performanceKeys.cycles.detail(id) });
      toast.success('Cycle closed.');
    },
    onError: () => toast.error('Failed to close cycle.'),
  });
}

export function useInitiateReviews(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cycleApi.initiateReviews(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: performanceKeys.reviews.lists() });
      toast.success(`${data.created_reviews} reviews initiated.`);
    },
    onError: () => toast.error('Failed to initiate reviews.'),
  });
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export function useGoals(filters: GoalFilters = {}) {
  return useQuery({
    queryKey: performanceKeys.goals.list(filters),
    queryFn: () => goalApi.list(filters),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalPayload) => goalApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.goals.lists() });
      toast.success('Goal created.');
    },
    onError: () => toast.error('Failed to create goal.'),
  });
}

export function useUpdateGoal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof goalApi.update>[1]) => goalApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.goals.lists() });
      toast.success('Goal updated.');
    },
    onError: () => toast.error('Failed to update goal.'),
  });
}

export function useDeleteGoal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => goalApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.goals.lists() });
      toast.success('Goal removed.');
    },
    onError: () => toast.error('Failed to remove goal.'),
  });
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export function useReviews(filters: ReviewFilters = {}) {
  return useQuery({
    queryKey: performanceKeys.reviews.list(filters),
    queryFn: () => reviewApi.list(filters),
  });
}

export function useReview(id: string | undefined) {
  return useQuery({
    queryKey: performanceKeys.reviews.detail(id ?? ''),
    queryFn: () => reviewApi.get(id!),
    enabled: !!id,
  });
}

export function useSubmitReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitReviewPayload) => reviewApi.submit(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.reviews.lists() });
      qc.invalidateQueries({ queryKey: performanceKeys.reviews.detail(id) });
      toast.success('Review submitted.');
    },
    onError: () => toast.error('Failed to submit review.'),
  });
}

export function useAcknowledgeReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comments?: string) => reviewApi.acknowledge(id, comments),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: performanceKeys.reviews.lists() });
      qc.invalidateQueries({ queryKey: performanceKeys.reviews.detail(id) });
      toast.success('Review acknowledged.');
    },
    onError: () => toast.error('Failed to acknowledge review.'),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function usePerformanceAnalytics(cycleId?: string) {
  return useQuery({
    queryKey: performanceKeys.analytics(cycleId),
    queryFn: () => performanceAnalyticsApi.get(cycleId),
  });
}

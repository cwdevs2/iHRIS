import { api, unwrap } from '@/lib/api';
import type {
  PerformanceReviewCycle,
  CycleListResponse,
  PerformanceGoal,
  GoalListResponse,
  PerformanceReview,
  ReviewListResponse,
  PerformanceAnalytics,
  CycleFilters,
  GoalFilters,
  ReviewFilters,
  CreateCyclePayload,
  CreateGoalPayload,
  SubmitReviewPayload,
} from '@/types';

const BASE = '/performance';

// ── Review Cycles ──────────────────────────────────────────────────────────────

export const cycleApi = {
  list: (filters?: CycleFilters) =>
    unwrap<CycleListResponse>(api.get(`${BASE}/cycles`, { params: filters })),

  get: (id: string) =>
    unwrap<{ cycle: PerformanceReviewCycle }>(api.get(`${BASE}/cycles/${id}`)),

  create: (data: CreateCyclePayload) =>
    unwrap<{ cycle: PerformanceReviewCycle }>(api.post(`${BASE}/cycles`, data)),

  update: (id: string, data: Partial<CreateCyclePayload>) =>
    unwrap<{ cycle: PerformanceReviewCycle }>(api.patch(`${BASE}/cycles/${id}`, data)),

  activate: (id: string) =>
    unwrap<{ cycle: PerformanceReviewCycle }>(api.post(`${BASE}/cycles/${id}/activate`)),

  close: (id: string) =>
    unwrap<{ cycle: PerformanceReviewCycle }>(api.post(`${BASE}/cycles/${id}/close`)),

  initiateReviews: (id: string) =>
    unwrap<{ created_reviews: number }>(api.post(`${BASE}/cycles/${id}/initiate-reviews`)),
};

// ── Goals ──────────────────────────────────────────────────────────────────────

export const goalApi = {
  list: (filters?: GoalFilters) =>
    unwrap<GoalListResponse>(api.get(`${BASE}/goals`, { params: filters })),

  create: (data: CreateGoalPayload) =>
    unwrap<{ goal: PerformanceGoal }>(api.post(`${BASE}/goals`, data)),

  update: (id: string, data: Partial<CreateGoalPayload> & { actual_value?: string }) =>
    unwrap<{ goal: PerformanceGoal }>(api.patch(`${BASE}/goals/${id}`, data)),

  delete: (id: string) =>
    unwrap<{ message: string }>(api.delete(`${BASE}/goals/${id}`)),
};

// ── Reviews ────────────────────────────────────────────────────────────────────

export const reviewApi = {
  list: (filters?: ReviewFilters) =>
    unwrap<ReviewListResponse>(api.get(`${BASE}/reviews`, { params: filters })),

  get: (id: string) =>
    unwrap<{ review: PerformanceReview }>(api.get(`${BASE}/reviews/${id}`)),

  submit: (id: string, data: SubmitReviewPayload) =>
    unwrap<{ review: PerformanceReview }>(api.post(`${BASE}/reviews/${id}/submit`, data)),

  acknowledge: (id: string, employeeComments?: string) =>
    unwrap<{ review: PerformanceReview }>(
      api.post(`${BASE}/reviews/${id}/acknowledge`, { employee_comments: employeeComments }),
    ),
};

// ── Analytics ──────────────────────────────────────────────────────────────────

export const performanceAnalyticsApi = {
  get: (cycleId?: string) =>
    unwrap<PerformanceAnalytics>(
      api.get(`${BASE}/analytics`, { params: cycleId ? { cycle_id: cycleId } : undefined }),
    ),
};

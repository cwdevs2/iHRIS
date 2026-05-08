// ── Performance Module Types ─────────────────────────────────────────────────

export type CycleType =
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'probationary'
  | 'custom';

export type CycleStatus = 'draft' | 'active' | 'completed' | 'archived';

export type GoalUnit = 'percentage' | 'number' | 'currency' | 'boolean' | 'text';

export type GoalStatus =
  | 'draft'
  | 'active'
  | 'achieved'
  | 'partially_achieved'
  | 'missed'
  | 'cancelled';

export type ReviewType = 'self' | 'manager' | 'peer';

export type ReviewStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'acknowledged';

// ── Entity Shapes ─────────────────────────────────────────────────────────────

export interface ReviewCriteria {
  id: string;
  name: string;
  description: string | null;
  weight: string;
  max_score: number;
  sort_order: number;
}

export interface PerformanceReviewCycle {
  id: string;
  name: string;
  type: CycleType;
  period_start: string;
  period_end: string;
  self_assessment_due: string | null;
  peer_review_due: string | null;
  manager_review_due: string | null;
  status: CycleStatus;
  enable_self_assessment: boolean;
  enable_peer_review: boolean;
  peer_nomination_limit: number;
  instructions: string | null;
  criteria?: ReviewCriteria[];
  creator?: { id: string; full_name: string };
  reviews_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PerformanceGoal {
  id: string;
  employee_id: string;
  employee?: { id: string; full_name: string };
  cycle_id: string | null;
  cycle?: { id: string; name: string } | null;
  title: string;
  description: string | null;
  target_value: string | null;
  actual_value: string | null;
  unit: GoalUnit;
  weight: string;
  status: GoalStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewScore {
  criteria_id: string;
  criteria?: string;
  score: string;
  comments: string | null;
}

export interface PerformanceReview {
  id: string;
  cycle_id: string;
  cycle?: {
    id: string;
    name: string;
    criteria: Array<{ id: string; name: string; weight: string; max_score: number }>;
  };
  employee_id: string;
  employee?: { id: string; full_name: string; position?: string };
  reviewer_id: string;
  reviewer?: { id: string; full_name: string };
  review_type: ReviewType;
  status: ReviewStatus;
  overall_score: string | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  development_plan: string | null;
  employee_comments: string | null;
  is_anonymous: boolean;
  scores?: ReviewScore[];
  submitted_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

// ── API List Responses ─────────────────────────────────────────────────────────

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface CycleListResponse {
  cycles: PerformanceReviewCycle[];
  pagination: Pagination;
}

export interface GoalListResponse {
  goals: PerformanceGoal[];
  pagination: Pagination;
}

export interface ReviewListResponse {
  reviews: PerformanceReview[];
  pagination: Pagination;
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export interface ScoreDistributionItem {
  band: string;
  count: number;
}

export interface TopPerformer {
  employee_id: string;
  overall_score: string;
  employee?: { id: string; full_name: string };
}

export interface PerformanceAnalytics {
  avg_score: number;
  submitted_reviews: number;
  pending_reviews: number;
  score_distribution: ScoreDistributionItem[];
  top_performers: TopPerformer[];
  active_cycles: number;
  goals_on_track: number;
}

// ── Filter Shapes ─────────────────────────────────────────────────────────────

export interface CycleFilters {
  status?: CycleStatus;
  type?: CycleType;
  per_page?: number;
  page?: number;
}

export interface GoalFilters {
  employee_id?: string;
  cycle_id?: string;
  status?: GoalStatus;
  per_page?: number;
  page?: number;
}

export interface ReviewFilters {
  cycle_id?: string;
  employee_id?: string;
  reviewer_id?: string;
  review_type?: ReviewType;
  status?: ReviewStatus;
  per_page?: number;
  page?: number;
}

// ── Form Payloads ──────────────────────────────────────────────────────────────

export interface CreateCyclePayload {
  name: string;
  type: CycleType;
  period_start: string;
  period_end: string;
  self_assessment_due?: string;
  peer_review_due?: string;
  manager_review_due?: string;
  enable_self_assessment?: boolean;
  enable_peer_review?: boolean;
  peer_nomination_limit?: number;
  instructions?: string;
  criteria?: Array<{
    name: string;
    description?: string;
    weight: number;
    max_score?: number;
  }>;
}

export interface CreateGoalPayload {
  employee_id: string;
  cycle_id?: string;
  title: string;
  description?: string;
  target_value?: string;
  unit?: GoalUnit;
  weight?: number;
  status?: 'draft' | 'active';
  due_date?: string;
}

export interface SubmitReviewPayload {
  strengths?: string;
  areas_for_improvement?: string;
  development_plan?: string;
  scores?: Array<{
    criteria_id: string;
    score: number;
    comments?: string;
  }>;
}

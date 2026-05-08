// ── Recruitment Module Types ────────────────────────────────────────────────

export type RequisitionStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'fulfilled';

export type PostingStatus = 'draft' | 'published' | 'closed' | 'archived';

export type ApplicantStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'evaluation'
  | 'offer'
  | 'hired'
  | 'rejected';

export type ApplicantStatus = 'active' | 'hired' | 'rejected' | 'withdrawn';

export type InterviewType =
  | 'phone_screen'
  | 'online'
  | 'onsite'
  | 'panel'
  | 'technical'
  | 'final';

export type InterviewStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export type EvaluationRecommendation =
  | 'strong_hire'
  | 'hire'
  | 'hold'
  | 'reject'
  | 'strong_reject';

export type OfferStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'withdrawn';

export type EmploymentType =
  | 'regular'
  | 'probationary'
  | 'contractual'
  | 'part_time'
  | 'project_based';

// ── Entity Shapes ────────────────────────────────────────────────────────────

export interface JobRequisition {
  id: string;
  department: { id: string; name: string } | null;
  position: { id: string; title: string } | null;
  requested_by: { id: string; full_name: string } | null;
  approved_by: { id: string; full_name: string } | null;
  headcount: number;
  justification: string | null;
  employment_type: EmploymentType;
  salary_min: string | null;
  salary_max: string | null;
  status: RequisitionStatus;
  notes: string | null;
  approved_at: string | null;
  job_postings?: JobPosting[];
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  job_requisition_id: string | null;
  requisition?: JobRequisition;
  title: string;
  description: string | null;
  requirements: string | null;
  responsibilities: string | null;
  location: string | null;
  employment_type: EmploymentType;
  salary_min: string | null;
  salary_max: string | null;
  show_salary: boolean;
  status: PostingStatus;
  published_at: string | null;
  closes_at: string | null;
  applicants_count?: number;
  creator?: { id: string; full_name: string };
  created_at: string;
  updated_at: string;
}

export interface Applicant {
  id: string;
  job_posting_id: string;
  job_posting?: JobPosting;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  has_resume: boolean;
  cover_letter: string | null;
  source: string | null;
  referrer_name: string | null;
  stage: ApplicantStage;
  status: ApplicantStatus;
  rejection_reason: string | null;
  interviews?: InterviewSchedule[];
  evaluations?: CandidateEvaluation[];
  offer_letters?: OfferLetter[];
  created_at: string;
  updated_at: string;
}

export interface InterviewSchedule {
  id: string;
  applicant_id: string;
  applicant?: Applicant;
  scheduled_by: string;
  scheduler?: { id: string; full_name: string };
  interviewers: string[];
  scheduled_at: string;
  duration_minutes: number;
  type: InterviewType;
  location: string | null;
  meeting_link: string | null;
  status: InterviewStatus;
  notes: string | null;
  feedback: string | null;
  created_at: string;
}

export interface EvaluationCriteriaScore {
  name: string;
  score: number;
  notes?: string;
}

export interface CandidateEvaluation {
  id: string;
  applicant_id: string;
  evaluated_by: string;
  evaluator?: { id: string; full_name: string };
  stage: string;
  overall_score: number | null;
  recommendation: EvaluationRecommendation | null;
  strengths: string | null;
  concerns: string | null;
  criteria_scores: EvaluationCriteriaScore[];
  created_at: string;
}

export interface OfferLetter {
  id: string;
  applicant_id: string;
  applicant?: Applicant;
  position?: { id: string; title: string };
  department?: { id: string; name: string };
  offered_salary: string;
  proposed_start_date: string;
  expires_at: string | null;
  status: OfferStatus;
  terms: string | null;
  decline_reason: string | null;
  responded_at: string | null;
  generated_by: string;
  created_at: string;
}

// ── API List Responses ────────────────────────────────────────────────────────

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface JobRequisitionListResponse {
  requisitions: JobRequisition[];
  pagination: Pagination;
}

export interface JobPostingListResponse {
  postings: JobPosting[];
  pagination: Pagination;
}

export interface ApplicantListResponse {
  applicants: Applicant[];
  pagination: Pagination;
}

// ── Filter Shapes ─────────────────────────────────────────────────────────────

export interface RequisitionFilters {
  search?: string;
  status?: RequisitionStatus;
  department_id?: string;
  per_page?: number;
  page?: number;
}

export interface PostingFilters {
  search?: string;
  status?: PostingStatus;
  per_page?: number;
  page?: number;
}

export interface ApplicantFilters {
  search?: string;
  job_posting_id?: string;
  stage?: ApplicantStage;
  status?: ApplicantStatus;
  per_page?: number;
  page?: number;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface RecruitmentAnalytics {
  open_postings: number;
  total_applicants: number;
  hired_this_month: number;
  pipeline_by_stage: Record<ApplicantStage, number>;
  by_source: Array<{ source: string; count: number }>;
  recent_postings: JobPosting[];
}

// ── Form Payloads ─────────────────────────────────────────────────────────────

export interface CreateRequisitionPayload {
  department_id?: string;
  position_id?: string;
  requested_by: string;
  headcount: number;
  justification?: string;
  employment_type: EmploymentType;
  salary_min?: number;
  salary_max?: number;
  status?: 'draft' | 'pending_approval';
  notes?: string;
}

export interface CreatePostingPayload {
  job_requisition_id?: string;
  title: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  location?: string;
  employment_type: EmploymentType;
  salary_min?: number;
  salary_max?: number;
  show_salary?: boolean;
  status?: 'draft' | 'published';
  closes_at?: string;
}

export interface CreateApplicantPayload {
  job_posting_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  cover_letter?: string;
  source?: string;
  referrer_name?: string;
}

export interface ScheduleInterviewPayload {
  applicant_id: string;
  interviewers?: string[];
  scheduled_at: string;
  duration_minutes?: number;
  type: InterviewType;
  location?: string;
  meeting_link?: string;
  notes?: string;
}

export interface GenerateOfferPayload {
  applicant_id: string;
  job_posting_id?: string;
  position_id?: string;
  department_id?: string;
  offered_salary: number;
  proposed_start_date: string;
  expires_at?: string;
  terms?: string;
}

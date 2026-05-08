import { api, unwrap } from '@/lib/api';
import type {
  JSendEnvelope,
  JobRequisition,
  JobRequisitionListResponse,
  JobPosting,
  JobPostingListResponse,
  Applicant,
  ApplicantListResponse,
  InterviewSchedule,
  CandidateEvaluation,
  OfferLetter,
  RecruitmentAnalytics,
  RequisitionFilters,
  PostingFilters,
  ApplicantFilters,
  CreateRequisitionPayload,
  CreatePostingPayload,
  CreateApplicantPayload,
  ScheduleInterviewPayload,
  GenerateOfferPayload,
  ApplicantStage,
} from '@/types';

const BASE = '/recruitment';

// ── Job Requisitions ──────────────────────────────────────────────────────────

export const requisitionApi = {
  list: (filters?: RequisitionFilters) =>
    unwrap<JobRequisitionListResponse>(
      api.get(`${BASE}/requisitions`, { params: filters }),
    ),

  get: (id: string) =>
    unwrap<{ requisition: JobRequisition }>(api.get(`${BASE}/requisitions/${id}`)),

  create: (data: CreateRequisitionPayload) =>
    unwrap<{ requisition: JobRequisition }>(api.post(`${BASE}/requisitions`, data)),

  update: (id: string, data: Partial<CreateRequisitionPayload>) =>
    unwrap<{ requisition: JobRequisition }>(api.patch(`${BASE}/requisitions/${id}`, data)),

  approve: (id: string, action: 'approve' | 'reject') =>
    unwrap<{ requisition: JobRequisition }>(
      api.post(`${BASE}/requisitions/${id}/approve`, { action }),
    ),
};

// ── Job Postings ──────────────────────────────────────────────────────────────

export const postingApi = {
  list: (filters?: PostingFilters) =>
    unwrap<JobPostingListResponse>(api.get(`${BASE}/postings`, { params: filters })),

  get: (id: string) =>
    unwrap<{ posting: JobPosting }>(api.get(`${BASE}/postings/${id}`)),

  create: (data: CreatePostingPayload) =>
    unwrap<{ posting: JobPosting }>(api.post(`${BASE}/postings`, data)),

  update: (id: string, data: Partial<CreatePostingPayload>) =>
    unwrap<{ posting: JobPosting }>(api.patch(`${BASE}/postings/${id}`, data)),
};

// ── Applicants ────────────────────────────────────────────────────────────────

export const applicantApi = {
  list: (filters?: ApplicantFilters) =>
    unwrap<ApplicantListResponse>(api.get(`${BASE}/applicants`, { params: filters })),

  get: (id: string) =>
    unwrap<{ applicant: Applicant }>(api.get(`${BASE}/applicants/${id}`)),

  create: (data: CreateApplicantPayload) =>
    unwrap<{ applicant: Applicant }>(api.post(`${BASE}/applicants`, data)),

  advanceStage: (id: string, stage: ApplicantStage, rejectionReason?: string) =>
    unwrap<{ applicant: Applicant }>(
      api.patch(`${BASE}/applicants/${id}/stage`, { stage, rejection_reason: rejectionReason }),
    ),

  uploadResume: (id: string, file: File) => {
    const form = new FormData();
    form.append('resume', file);
    return unwrap<{ applicant: Applicant }>(
      api.post(`${BASE}/applicants/${id}/resume`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
};

// ── Interviews ────────────────────────────────────────────────────────────────

export const interviewApi = {
  schedule: (data: ScheduleInterviewPayload) =>
    unwrap<{ interview: InterviewSchedule }>(api.post(`${BASE}/interviews`, data)),

  update: (id: string, data: Partial<ScheduleInterviewPayload> & { status?: string; feedback?: string }) =>
    unwrap<{ interview: InterviewSchedule }>(api.patch(`${BASE}/interviews/${id}`, data)),
};

// ── Evaluations ───────────────────────────────────────────────────────────────

export const evaluationApi = {
  submit: (data: {
    applicant_id: string;
    stage: string;
    overall_score?: number;
    recommendation?: string;
    strengths?: string;
    concerns?: string;
    criteria_scores?: Array<{ name: string; score: number; notes?: string }>;
  }) =>
    unwrap<{ evaluation: CandidateEvaluation }>(api.post(`${BASE}/evaluations`, data)),
};

// ── Offer Letters ─────────────────────────────────────────────────────────────

export const offerApi = {
  generate: (data: GenerateOfferPayload) =>
    unwrap<{ offer_letter: OfferLetter }>(api.post(`${BASE}/offers`, data)),

  updateStatus: (id: string, status: string, declineReason?: string) =>
    unwrap<{ offer_letter: OfferLetter }>(
      api.patch(`${BASE}/offers/${id}/status`, { status, decline_reason: declineReason }),
    ),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const recruitmentAnalyticsApi = {
  get: () => unwrap<RecruitmentAnalytics>(api.get(`${BASE}/analytics`)),
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  requisitionApi,
  postingApi,
  applicantApi,
  interviewApi,
  evaluationApi,
  offerApi,
  recruitmentAnalyticsApi,
} from '@/api/recruitment';
import type {
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

// ── Query Keys ────────────────────────────────────────────────────────────────

export const recruitmentKeys = {
  requisitions: {
    all: ['requisitions'] as const,
    lists: () => [...recruitmentKeys.requisitions.all, 'list'] as const,
    list: (f: RequisitionFilters) => [...recruitmentKeys.requisitions.lists(), f] as const,
    detail: (id: string) => [...recruitmentKeys.requisitions.all, 'detail', id] as const,
  },
  postings: {
    all: ['job-postings'] as const,
    lists: () => [...recruitmentKeys.postings.all, 'list'] as const,
    list: (f: PostingFilters) => [...recruitmentKeys.postings.lists(), f] as const,
    detail: (id: string) => [...recruitmentKeys.postings.all, 'detail', id] as const,
  },
  applicants: {
    all: ['applicants'] as const,
    lists: () => [...recruitmentKeys.applicants.all, 'list'] as const,
    list: (f: ApplicantFilters) => [...recruitmentKeys.applicants.lists(), f] as const,
    detail: (id: string) => [...recruitmentKeys.applicants.all, 'detail', id] as const,
  },
  analytics: ['recruitment-analytics'] as const,
};

// ── Requisitions ──────────────────────────────────────────────────────────────

export function useRequisitions(filters: RequisitionFilters = {}) {
  return useQuery({
    queryKey: recruitmentKeys.requisitions.list(filters),
    queryFn: () => requisitionApi.list(filters),
  });
}

export function useRequisition(id: string | undefined) {
  return useQuery({
    queryKey: recruitmentKeys.requisitions.detail(id ?? ''),
    queryFn: () => requisitionApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRequisitionPayload) => requisitionApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.requisitions.lists() });
      toast.success('Requisition created.');
    },
    onError: () => toast.error('Failed to create requisition.'),
  });
}

export function useUpdateRequisition(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateRequisitionPayload>) => requisitionApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.requisitions.lists() });
      qc.invalidateQueries({ queryKey: recruitmentKeys.requisitions.detail(id) });
      toast.success('Requisition updated.');
    },
    onError: () => toast.error('Failed to update requisition.'),
  });
}

export function useApproveRequisition(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: 'approve' | 'reject') => requisitionApi.approve(id, action),
    onSuccess: (_, action) => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.requisitions.lists() });
      qc.invalidateQueries({ queryKey: recruitmentKeys.requisitions.detail(id) });
      toast.success(action === 'approve' ? 'Requisition approved.' : 'Requisition rejected.');
    },
    onError: () => toast.error('Action failed.'),
  });
}

// ── Job Postings ──────────────────────────────────────────────────────────────

export function usePostings(filters: PostingFilters = {}) {
  return useQuery({
    queryKey: recruitmentKeys.postings.list(filters),
    queryFn: () => postingApi.list(filters),
  });
}

export function usePosting(id: string | undefined) {
  return useQuery({
    queryKey: recruitmentKeys.postings.detail(id ?? ''),
    queryFn: () => postingApi.get(id!),
    enabled: !!id,
  });
}

export function useCreatePosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostingPayload) => postingApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.postings.lists() });
      toast.success('Job posting created.');
    },
    onError: () => toast.error('Failed to create posting.'),
  });
}

export function useUpdatePosting(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreatePostingPayload>) => postingApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.postings.lists() });
      qc.invalidateQueries({ queryKey: recruitmentKeys.postings.detail(id) });
      toast.success('Job posting updated.');
    },
    onError: () => toast.error('Failed to update posting.'),
  });
}

// ── Applicants ────────────────────────────────────────────────────────────────

export function useApplicants(filters: ApplicantFilters = {}) {
  return useQuery({
    queryKey: recruitmentKeys.applicants.list(filters),
    queryFn: () => applicantApi.list(filters),
  });
}

export function useApplicant(id: string | undefined) {
  return useQuery({
    queryKey: recruitmentKeys.applicants.detail(id ?? ''),
    queryFn: () => applicantApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApplicantPayload) => applicantApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.applicants.lists() });
      toast.success('Applicant added.');
    },
    onError: () => toast.error('Failed to add applicant.'),
  });
}

export function useAdvanceApplicantStage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stage, rejectionReason }: { stage: ApplicantStage; rejectionReason?: string }) =>
      applicantApi.advanceStage(id, stage, rejectionReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.applicants.lists() });
      qc.invalidateQueries({ queryKey: recruitmentKeys.applicants.detail(id) });
      toast.success('Applicant stage updated.');
    },
    onError: () => toast.error('Failed to update stage.'),
  });
}

// ── Interviews ────────────────────────────────────────────────────────────────

export function useScheduleInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduleInterviewPayload) => interviewApi.schedule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.applicants.all });
      toast.success('Interview scheduled.');
    },
    onError: () => toast.error('Failed to schedule interview.'),
  });
}

export function useUpdateInterview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof interviewApi.update>[1]) => interviewApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.applicants.all });
      toast.success('Interview updated.');
    },
    onError: () => toast.error('Failed to update interview.'),
  });
}

// ── Evaluations ───────────────────────────────────────────────────────────────

export function useSubmitEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof evaluationApi.submit>[0]) => evaluationApi.submit(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.applicants.all });
      toast.success('Evaluation submitted.');
    },
    onError: () => toast.error('Failed to submit evaluation.'),
  });
}

// ── Offer Letters ─────────────────────────────────────────────────────────────

export function useGenerateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateOfferPayload) => offerApi.generate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.applicants.all });
      toast.success('Offer letter generated.');
    },
    onError: () => toast.error('Failed to generate offer letter.'),
  });
}

export function useUpdateOfferStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status, declineReason }: { status: string; declineReason?: string }) =>
      offerApi.updateStatus(id, status, declineReason),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: recruitmentKeys.applicants.all });
      toast.success(`Offer ${status}.`);
    },
    onError: () => toast.error('Failed to update offer status.'),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export function useRecruitmentAnalytics() {
  return useQuery({
    queryKey: recruitmentKeys.analytics,
    queryFn: () => recruitmentAnalyticsApi.get(),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  complianceApi,
  type CreateFilingInput,
  type CreatePolicyInput,
  type MarkFiledInput,
  type UpdatePolicyInput,
} from '@/api/compliance';

export const complianceKeys = {
  all: ['compliance'] as const,
  policies: () => [...complianceKeys.all, 'policies'] as const,
  policiesList: (filters: Record<string, unknown>) => [...complianceKeys.policies(), 'list', filters] as const,
  policy: (id: string) => [...complianceKeys.policies(), id] as const,
  coverage: () => [...complianceKeys.all, 'coverage'] as const,
  filings: () => [...complianceKeys.all, 'filings'] as const,
  filingsList: (filters: Record<string, unknown>) => [...complianceKeys.filings(), 'list', filters] as const,
};

export function usePolicies(filters: { category?: string; status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: complianceKeys.policiesList(filters),
    queryFn: () => complianceApi.listPolicies(filters),
  });
}

export function usePolicy(id: string | undefined) {
  return useQuery({
    queryKey: complianceKeys.policy(id ?? ''),
    queryFn: () => complianceApi.getPolicy(id!),
    enabled: !!id,
  });
}

export function usePolicyCoverage() {
  return useQuery({
    queryKey: complianceKeys.coverage(),
    queryFn: () => complianceApi.coverage(),
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePolicyInput) => complianceApi.createPolicy(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.policies() });
      toast.success('Policy created.');
    },
    onError: () => toast.error('Failed to create policy.'),
  });
}

export function useUpdatePolicy(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePolicyInput) => complianceApi.updatePolicy(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.policies() });
      qc.invalidateQueries({ queryKey: complianceKeys.policy(id) });
      toast.success('Policy updated.');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to update policy.'),
  });
}

export function usePublishPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complianceApi.publishPolicy(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: complianceKeys.policies() });
      qc.invalidateQueries({ queryKey: complianceKeys.policy(id) });
      toast.success('Policy published.');
    },
    onError: () => toast.error('Failed to publish policy.'),
  });
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => complianceApi.acknowledgePolicy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.policies() });
      qc.invalidateQueries({ queryKey: complianceKeys.coverage() });
      toast.success('Policy acknowledged.');
    },
    onError: () => toast.error('Failed to acknowledge policy.'),
  });
}

export function useFilings(filters: { agency?: string; status?: string; due_within_days?: number } = {}) {
  return useQuery({
    queryKey: complianceKeys.filingsList(filters),
    queryFn: () => complianceApi.listFilings(filters),
  });
}

export function useCreateFiling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFilingInput) => complianceApi.createFiling(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.filings() });
      toast.success('Filing reminder created.');
    },
    onError: () => toast.error('Failed to create filing.'),
  });
}

export function useMarkFiled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: MarkFiledInput }) => complianceApi.markFiled(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complianceKeys.filings() });
      toast.success('Filing marked as filed.');
    },
    onError: () => toast.error('Failed to update filing.'),
  });
}

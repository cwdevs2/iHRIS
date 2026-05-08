import { api, unwrap } from '@/lib/api';
import type {
  JSendEnvelope,
  CompliancePolicy,
  PolicyListResponse,
  PolicyCoverage,
  RegulatoryFiling,
  FilingListResponse,
} from '@/types';

export type CreatePolicyInput = {
  title: string;
  category: string;
  version?: number;
  body: string;
  effective_on?: string;
  expires_on?: string;
  requires_acknowledgment?: boolean;
};

export type UpdatePolicyInput = Partial<CreatePolicyInput>;

export type CreateFilingInput = {
  agency: string;
  form_code: string;
  title: string;
  period_covered_start?: string;
  period_covered_end?: string;
  due_on: string;
  notes?: string;
};

export type MarkFiledInput = {
  filed_on?: string;
  reference_number?: string;
  notes?: string;
};

export const complianceApi = {
  // Policies
  listPolicies: (filters: { category?: string; status?: string; search?: string } = {}): Promise<PolicyListResponse> =>
    unwrap(api.get<JSendEnvelope<PolicyListResponse>>('/compliance/policies', { params: filters })),

  getPolicy: (id: string): Promise<{ policy: CompliancePolicy }> =>
    unwrap(api.get<JSendEnvelope<{ policy: CompliancePolicy }>>(`/compliance/policies/${id}`)),

  createPolicy: (data: CreatePolicyInput): Promise<{ policy: CompliancePolicy }> =>
    unwrap(api.post<JSendEnvelope<{ policy: CompliancePolicy }>>('/compliance/policies', data)),

  updatePolicy: (id: string, data: UpdatePolicyInput): Promise<{ policy: CompliancePolicy }> =>
    unwrap(api.patch<JSendEnvelope<{ policy: CompliancePolicy }>>(`/compliance/policies/${id}`, data)),

  publishPolicy: (id: string): Promise<{ policy: CompliancePolicy }> =>
    unwrap(api.post<JSendEnvelope<{ policy: CompliancePolicy }>>(`/compliance/policies/${id}/publish`, {})),

  acknowledgePolicy: (id: string): Promise<{ acknowledgment: unknown }> =>
    unwrap(api.post<JSendEnvelope<{ acknowledgment: unknown }>>(`/compliance/policies/${id}/acknowledge`, {})),

  coverage: (): Promise<{ coverage: PolicyCoverage[] }> =>
    unwrap(api.get<JSendEnvelope<{ coverage: PolicyCoverage[] }>>('/compliance/coverage')),

  // Filings
  listFilings: (filters: { agency?: string; status?: string; due_within_days?: number } = {}): Promise<FilingListResponse> =>
    unwrap(api.get<JSendEnvelope<FilingListResponse>>('/compliance/filings', { params: filters })),

  createFiling: (data: CreateFilingInput): Promise<{ filing: RegulatoryFiling }> =>
    unwrap(api.post<JSendEnvelope<{ filing: RegulatoryFiling }>>('/compliance/filings', data)),

  markFiled: (id: string, data: MarkFiledInput = {}): Promise<{ filing: RegulatoryFiling }> =>
    unwrap(api.patch<JSendEnvelope<{ filing: RegulatoryFiling }>>(`/compliance/filings/${id}/file`, data)),
};

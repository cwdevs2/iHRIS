// Phase 7 — Compliance Management types

export type PolicyStatus = 'draft' | 'published' | 'archived';

export interface CompliancePolicy {
  id: string;
  title: string;
  category: string;
  version: number;
  body: string;
  effective_on: string | null;
  expires_on: string | null;
  requires_acknowledgment: boolean;
  status: PolicyStatus;
  published_at: string | null;
  publisher?: string | null;
  acknowledgments_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PolicyListResponse {
  policies: CompliancePolicy[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export type FilingStatus = 'pending' | 'in_progress' | 'filed' | 'overdue' | 'cancelled';

export interface RegulatoryFiling {
  id: string;
  agency: string;
  form_code: string;
  title: string;
  period: { start: string | null; end: string | null };
  due_on: string | null;
  days_until_due: number | null;
  status: FilingStatus;
  filed_on: string | null;
  reference_number: string | null;
  notes: string | null;
  filer?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FilingListResponse {
  filings: RegulatoryFiling[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface PolicyCoverage {
  policy_id: string;
  title: string;
  category: string;
  acknowledged: number;
  outstanding: number;
  coverage_pct: number;
}

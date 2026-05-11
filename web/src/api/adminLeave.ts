import { api, unwrap } from '@/lib/api';
import type { JSendEnvelope, LeaveType, LeaveBalance } from '@/types';

export type AdminLeaveRequest = {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    user?: { first_name: string; last_name: string };
    position?: { name: string };
    department?: { name: string };
  };
  leave_type_id: string;
  leave_type?: { id: string; code: string; name: string };
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  attachment_path: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
};

export type AdminLeaveFilters = {
  employee_id?: string;
  status?: string;
  leave_type_id?: string;
  from?: string;
  to?: string;
  per_page?: number;
  page?: number;
};

export type AdminLeaveListResponse = {
  requests: AdminLeaveRequest[];
  pagination: { total: number; per_page: number; current_page: number; last_page: number };
};

export type AdminLeaveBalance = LeaveBalance & { id: string; year: number };

export type AdminLeaveBalancesResponse = {
  balances: AdminLeaveBalance[];
};

export type CreateLeaveTypeInput = {
  code: string;
  name: string;
  description?: string;
  default_credits: number;
  requires_attachment?: boolean;
  is_paid?: boolean;
  is_active?: boolean;
};

export const adminLeaveApi = {
  list: (filters: AdminLeaveFilters = {}): Promise<AdminLeaveListResponse> =>
    unwrap(api.get<JSendEnvelope<AdminLeaveListResponse>>('/admin/leave', { params: filters })),

  approve: (id: string, note?: string): Promise<{ request: AdminLeaveRequest }> =>
    unwrap(api.post<JSendEnvelope<{ request: AdminLeaveRequest }>>(`/admin/leave/${id}/approve`, { note })),

  reject: (id: string, note: string): Promise<{ request: AdminLeaveRequest }> =>
    unwrap(api.post<JSendEnvelope<{ request: AdminLeaveRequest }>>(`/admin/leave/${id}/reject`, { note })),

  types: (): Promise<{ types: LeaveType[] }> =>
    unwrap(api.get<JSendEnvelope<{ types: LeaveType[] }>>('/admin/leave/types')),

  createType: (data: CreateLeaveTypeInput): Promise<{ type: LeaveType }> =>
    unwrap(api.post<JSendEnvelope<{ type: LeaveType }>>('/admin/leave/types', data)),

  updateType: (id: string, data: Partial<CreateLeaveTypeInput & { is_active: boolean }>): Promise<{ type: LeaveType }> =>
    unwrap(api.patch<JSendEnvelope<{ type: LeaveType }>>(`/admin/leave/types/${id}`, data)),

  balances: (employeeId: string, year?: number): Promise<AdminLeaveBalancesResponse> =>
    unwrap(api.get<JSendEnvelope<AdminLeaveBalancesResponse>>('/admin/leave/balances', {
      params: { employee_id: employeeId, ...(year ? { year } : {}) },
    })),

  adjustBalance: (id: string, credits: number, reason?: string): Promise<{ balance: AdminLeaveBalance }> =>
    unwrap(api.patch<JSendEnvelope<{ balance: AdminLeaveBalance }>>(`/admin/leave/balances/${id}`, { credits, reason })),
};

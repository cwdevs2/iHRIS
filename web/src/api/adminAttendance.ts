import { api, unwrap } from '@/lib/api';
import type {
  JSendEnvelope,
  AttendanceLog,
  AttendanceCorrectionRequest,
} from '@/types';

export type AdminAttendanceFilters = {
  employee_id?: string;
  from?: string;
  to?: string;
  status?: string;
  per_page?: number;
  page?: number;
};

export type ManualEntryInput = {
  employee_id: string;
  work_date: string;
  clock_in_at?: string;  // "HH:mm"
  clock_out_at?: string; // "HH:mm"
  status: 'present' | 'late' | 'undertime' | 'absent' | 'on_leave' | 'holiday';
  remarks?: string;
};

export type CorrectionFilters = {
  employee_id?: string;
  status?: 'pending' | 'approved' | 'rejected';
  per_page?: number;
  page?: number;
};

export type AttendanceListResponse = {
  logs: AttendanceLog[];
  pagination: { total: number; per_page: number; current_page: number; last_page: number };
};

export type CorrectionListResponse = {
  corrections: AttendanceCorrectionRequest[];
  pagination: { total: number; per_page: number; current_page: number; last_page: number };
};

export const adminAttendanceApi = {
  list: (filters: AdminAttendanceFilters = {}): Promise<AttendanceListResponse> =>
    unwrap(api.get<JSendEnvelope<AttendanceListResponse>>('/admin/attendance', { params: filters })),

  manual: (data: ManualEntryInput): Promise<{ log: AttendanceLog }> =>
    unwrap(api.post<JSendEnvelope<{ log: AttendanceLog }>>('/admin/attendance/manual', data)),

  listCorrections: (filters: CorrectionFilters = {}): Promise<CorrectionListResponse> =>
    unwrap(api.get<JSendEnvelope<CorrectionListResponse>>('/admin/attendance/corrections', { params: filters })),

  approveCorrection: (id: string, note?: string): Promise<{ correction: AttendanceCorrectionRequest }> =>
    unwrap(api.patch<JSendEnvelope<{ correction: AttendanceCorrectionRequest }>>(`/admin/attendance/corrections/${id}/approve`, { note })),

  rejectCorrection: (id: string, note: string): Promise<{ correction: AttendanceCorrectionRequest }> =>
    unwrap(api.patch<JSendEnvelope<{ correction: AttendanceCorrectionRequest }>>(`/admin/attendance/corrections/${id}/reject`, { note })),
};

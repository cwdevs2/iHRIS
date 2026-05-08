import { api, unwrap } from '@/lib/api';
import type {
  JSendEnvelope,
  AttendanceLog,
  AttendanceLogListResponse,
  AttendanceCorrectionRequest,
  AttendanceCorrectionListResponse,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestListResponse,
  ProfileUpdateRequest,
  ProfileUpdateRequestListResponse,
} from '@/types';

// ─── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceFilters = {
  from?: string;
  to?: string;
  per_page?: number;
  page?: number;
};

export type ClockInInput = {
  lat?: number;
  lng?: number;
  location_type?: 'on_site' | 'remote' | 'field';
};

export type ClockOutInput = {
  lat?: number;
  lng?: number;
};

export type FileCorrectionInput = {
  work_date: string;
  requested_clock_in?: string;
  requested_clock_out?: string;
  reason: string;
};

export const essAttendanceApi = {
  list: (filters: AttendanceFilters = {}): Promise<AttendanceLogListResponse> =>
    unwrap(api.get<JSendEnvelope<AttendanceLogListResponse>>('/ess/attendance', { params: filters })),

  today: (): Promise<{ log: AttendanceLog | null }> =>
    unwrap(api.get<JSendEnvelope<{ log: AttendanceLog | null }>>('/ess/attendance/today')),

  clockIn: (data: ClockInInput = {}): Promise<{ log: AttendanceLog }> =>
    unwrap(api.post<JSendEnvelope<{ log: AttendanceLog }>>('/ess/attendance/clock-in', data)),

  clockOut: (data: ClockOutInput = {}): Promise<{ log: AttendanceLog }> =>
    unwrap(api.post<JSendEnvelope<{ log: AttendanceLog }>>('/ess/attendance/clock-out', data)),

  listCorrections: (params?: { per_page?: number; page?: number }): Promise<AttendanceCorrectionListResponse> =>
    unwrap(api.get<JSendEnvelope<AttendanceCorrectionListResponse>>('/ess/attendance/corrections', { params })),

  fileCorrection: (data: FileCorrectionInput): Promise<{ correction: AttendanceCorrectionRequest }> =>
    unwrap(api.post<JSendEnvelope<{ correction: AttendanceCorrectionRequest }>>('/ess/attendance/corrections', data)),
};

// ─── Leave ────────────────────────────────────────────────────────────────────

export type LeaveFilters = {
  status?: string;
  per_page?: number;
  page?: number;
};

export type FileLeaveInput = {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
};

export const essLeaveApi = {
  types: (): Promise<{ types: LeaveType[] }> =>
    unwrap(api.get<JSendEnvelope<{ types: LeaveType[] }>>('/ess/leave/types')),

  balances: (year?: number): Promise<{ balances: LeaveBalance[] }> =>
    unwrap(api.get<JSendEnvelope<{ balances: LeaveBalance[] }>>('/ess/leave/balances', { params: year ? { year } : undefined })),

  list: (filters: LeaveFilters = {}): Promise<LeaveRequestListResponse> =>
    unwrap(api.get<JSendEnvelope<LeaveRequestListResponse>>('/ess/leave', { params: filters })),

  file: (data: FileLeaveInput): Promise<{ request: LeaveRequest }> =>
    unwrap(api.post<JSendEnvelope<{ request: LeaveRequest }>>('/ess/leave', data)),

  cancel: (id: string): Promise<{ request: LeaveRequest }> =>
    unwrap(api.delete<JSendEnvelope<{ request: LeaveRequest }>>(`/ess/leave/${id}`)),
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export type ProfileUpdateInput = Partial<{
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  province: string;
  postal_code: string;
  civil_status: string;
  emergency_contact: {
    name?: string;
    relationship?: string;
    phone?: string;
    address?: string;
  };
}>;

export const essProfileApi = {
  get: (): Promise<{ employee: import('@/types').Employee }> =>
    unwrap(api.get<JSendEnvelope<{ employee: import('@/types').Employee }>>('/ess/profile')),

  updateRequests: (params?: { per_page?: number; page?: number }): Promise<ProfileUpdateRequestListResponse> =>
    unwrap(api.get<JSendEnvelope<ProfileUpdateRequestListResponse>>('/ess/profile/update-requests', { params })),

  requestUpdate: (data: ProfileUpdateInput): Promise<{ request: ProfileUpdateRequest }> =>
    unwrap(api.post<JSendEnvelope<{ request: ProfileUpdateRequest }>>('/ess/profile/update-requests', data)),
};

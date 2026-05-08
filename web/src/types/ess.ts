// ─── ESS — Employee Self Service types ───────────────────────────────────────

export type AttendanceStatus = 'present' | 'late' | 'undertime' | 'absent' | 'on_leave' | 'holiday';
export type AttendanceLocationType = 'on_site' | 'remote' | 'field';
export type AttendanceSource = 'web' | 'qr' | 'biometric' | 'manual';
export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface AttendanceLog {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  clock_in_ip: string | null;
  clock_out_ip: string | null;
  clock_in_lat: string | null;
  clock_in_lng: string | null;
  clock_out_lat: string | null;
  clock_out_lng: string | null;
  location_type: AttendanceLocationType;
  regular_hours: string;
  overtime_hours: string;
  late_minutes: string;
  undertime_minutes: string;
  status: AttendanceStatus;
  is_corrected: boolean;
  source: AttendanceSource;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  employee_id: string;
  attendance_log_id: string | null;
  work_date: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  reason: string;
  status: CorrectionStatus;
  reviewed_by: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ─── Leave ────────────────────────────────────────────────────────────────────

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  default_credits: number;
  requires_attachment: boolean;
  is_paid: boolean;
  is_active: boolean;
}

export interface LeaveBalance {
  leave_type: { id: string; code: string; name: string };
  credits: number;
  used: number;
  pending: number;
  available: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  leave_type?: { id: string; code: string; name: string };
  start_date: string;
  end_date: string;
  total_days: string;
  reason: string;
  attachment_path: string | null;
  status: LeaveStatus;
  current_approver_level: number;
  approvals: Array<{
    level: number;
    approver_id: string;
    status: string;
    note?: string;
    decided_at?: string;
  }> | null;
  created_at: string;
}

// ─── Profile update requests ──────────────────────────────────────────────────

export type ProfileUpdateStatus = 'pending' | 'approved' | 'rejected';

export interface ProfileUpdateRequest {
  id: string;
  employee_id: string;
  requested_changes: Record<string, { old: unknown; new: unknown }>;
  status: ProfileUpdateStatus;
  reviewed_by: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface AttendanceLogListResponse {
  logs: AttendanceLog[];
  pagination: Pagination;
}

export interface AttendanceCorrectionListResponse {
  corrections: AttendanceCorrectionRequest[];
  pagination: Pagination;
}

export interface LeaveRequestListResponse {
  requests: LeaveRequest[];
  pagination: Pagination;
}

export interface ProfileUpdateRequestListResponse {
  requests: ProfileUpdateRequest[];
  pagination: Pagination;
}

interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

import { api, unwrap } from '@/lib/api';
import type {
  JSendEnvelope,
  Employee,
  EmployeeListResponse,
  EmployeeFilters,
  Department,
  DepartmentListResponse,
  Position,
  PositionListResponse,
  EmployeeDocument,
  DocumentListResponse,
  DocumentFilters,
  AuditLogListResponse,
  AuditLogFilters,
} from '@/types';

// ─── Employees ────────────────────────────────────────────────────────────────

export type CreateEmployeeInput = {
  // Identity — auto-creates a linked User when user_id is absent
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  email?: string;
  phone?: string | null;
  user_id?: string | null;
  employee_number?: string | null;
  department_id?: string | null;
  position_id?: string | null;
  reports_to_id?: string | null;
  employment_status: string;
  date_hired?: string | null;
  regularization_date?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  civil_status?: string | null;
  nationality?: string | null;
  religion?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  sss_number?: string | null;
  philhealth_number?: string | null;
  pagibig_number?: string | null;
  tin?: string | null;
  basic_salary?: number | null;
  pay_frequency?: string | null;
  shift_type?: 'day' | 'evening' | 'night' | 'custom' | null;
  shift_start?: string | null;
  shift_end?: string | null;
  work_days?: string[] | null;
  emergency_contact?: {
    name?: string;
    relationship?: string;
    phone?: string;
    address?: string;
  } | null;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export const employeeApi = {
  list: (filters: EmployeeFilters = {}): Promise<EmployeeListResponse> =>
    unwrap(api.get<JSendEnvelope<EmployeeListResponse>>('/employees', { params: filters })),

  get: (id: string): Promise<{ employee: Employee }> =>
    unwrap(api.get<JSendEnvelope<{ employee: Employee }>>(`/employees/${id}`)),

  create: (data: CreateEmployeeInput): Promise<{ employee: Employee }> =>
    unwrap(api.post<JSendEnvelope<{ employee: Employee }>>('/employees', data)),

  update: (id: string, data: UpdateEmployeeInput): Promise<{ employee: Employee }> =>
    unwrap(api.patch<JSendEnvelope<{ employee: Employee }>>(`/employees/${id}`, data)),

  delete: (id: string): Promise<{ message: string }> =>
    unwrap(api.delete<JSendEnvelope<{ message: string }>>(`/employees/${id}`)),
};

// ─── Departments ──────────────────────────────────────────────────────────────

export type CreateDepartmentInput = {
  code: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  head_user_id?: string | null;
  is_active?: boolean;
};

export type UpdateDepartmentInput = Partial<CreateDepartmentInput>;

export const departmentApi = {
  list: (params?: { all?: boolean; search?: string; per_page?: number; page?: number }): Promise<DepartmentListResponse> =>
    unwrap(api.get<JSendEnvelope<DepartmentListResponse>>('/departments', { params })),

  get: (id: string): Promise<{ department: Department }> =>
    unwrap(api.get<JSendEnvelope<{ department: Department }>>(`/departments/${id}`)),

  create: (data: CreateDepartmentInput): Promise<{ department: Department }> =>
    unwrap(api.post<JSendEnvelope<{ department: Department }>>('/departments', data)),

  update: (id: string, data: UpdateDepartmentInput): Promise<{ department: Department }> =>
    unwrap(api.patch<JSendEnvelope<{ department: Department }>>(`/departments/${id}`, data)),

  delete: (id: string): Promise<{ message: string }> =>
    unwrap(api.delete<JSendEnvelope<{ message: string }>>(`/departments/${id}`)),
};

// ─── Positions ────────────────────────────────────────────────────────────────

export type CreatePositionInput = {
  department_id?: string | null;
  code?: string;
  title: string;
  description?: string | null;
  rank_level?: number | null;
  min_salary?: number | null;
  max_salary?: number | null;
  is_active?: boolean;
};

export type UpdatePositionInput = Partial<CreatePositionInput>;

export const positionApi = {
  list: (params?: { all?: boolean; department_id?: string; search?: string; per_page?: number; page?: number }): Promise<PositionListResponse> =>
    unwrap(api.get<JSendEnvelope<PositionListResponse>>('/positions', { params })),

  get: (id: string): Promise<{ position: Position }> =>
    unwrap(api.get<JSendEnvelope<{ position: Position }>>(`/positions/${id}`)),

  create: (data: CreatePositionInput): Promise<{ position: Position }> =>
    unwrap(api.post<JSendEnvelope<{ position: Position }>>('/positions', data)),

  update: (id: string, data: UpdatePositionInput): Promise<{ position: Position }> =>
    unwrap(api.patch<JSendEnvelope<{ position: Position }>>(`/positions/${id}`, data)),

  delete: (id: string): Promise<{ message: string }> =>
    unwrap(api.delete<JSendEnvelope<{ message: string }>>(`/positions/${id}`)),
};

// ─── Documents ────────────────────────────────────────────────────────────────

export const documentApi = {
  list: (employeeId: string, filters?: DocumentFilters): Promise<DocumentListResponse> =>
    unwrap(api.get<JSendEnvelope<DocumentListResponse>>(`/employees/${employeeId}/documents`, { params: filters })),

  upload: (employeeId: string, formData: FormData): Promise<{ document: EmployeeDocument }> =>
    unwrap(api.post<JSendEnvelope<{ document: EmployeeDocument }>>(`/employees/${employeeId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })),

  download: (id: string): Promise<{ url: string; file_name: string; mime_type: string }> =>
    unwrap(api.get<JSendEnvelope<{ url: string; file_name: string; mime_type: string }>>(`/documents/${id}/download`)),

  delete: (id: string): Promise<{ message: string }> =>
    unwrap(api.delete<JSendEnvelope<{ message: string }>>(`/documents/${id}`)),
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogApi = {
  list: (filters?: AuditLogFilters): Promise<AuditLogListResponse> =>
    unwrap(api.get<JSendEnvelope<AuditLogListResponse>>('/audit-logs', { params: filters })),
};


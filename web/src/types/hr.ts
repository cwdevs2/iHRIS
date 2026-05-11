// ─── Shared lookup types ──────────────────────────────────────────────────────

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface SystemUser {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  mfa_enabled: boolean;
  last_login_at: string | null;
  email_verified_at: string | null;
  roles: Array<{ id: string; name: string; display_name: string }>;
  employee: { id: string; employee_number: string } | null;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  users: SystemUser[];
  pagination: Pagination;
}

export interface UserFilters {
  search?: string;
  status?: UserStatus;
  role?: string;
  per_page?: number;
  page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
}

export interface PositionSummary {
  id: string;
  title: string;
  code: string;
}

export interface ManagerSummary {
  id: string;
  full_name: string | null;
}

// ─── Employee ─────────────────────────────────────────────────────────────────

export type EmploymentStatus =
  | 'regular'
  | 'probationary'
  | 'contractual'
  | 'part_time'
  | 'project_based'
  | 'resigned'
  | 'terminated'
  | 'on_leave';

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type CivilStatus = 'single' | 'married' | 'widowed' | 'separated' | 'divorced';
export type PayFrequency = 'monthly' | 'semi_monthly' | 'weekly' | 'daily';

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
  address?: string;
}

export interface Employee {
  id: string;
  employee_number: string;
  user_id: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  account_status: 'active' | 'inactive' | 'suspended' | null;
  employment_status: EmploymentStatus;
  date_hired: string | null;
  regularization_date: string | null;
  separation_date: string | null;
  department_id: string | null;
  department: DepartmentSummary | null;
  position_id: string | null;
  position: PositionSummary | null;
  reports_to_id: string | null;
  manager: ManagerSummary | null;
  birth_date: string | null;
  gender: Gender | null;
  civil_status: CivilStatus | null;
  nationality: string | null;
  religion: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  /** Only present when user has hr.employees.view_sensitive permission */
  sss_number?: string | null;
  philhealth_number?: string | null;
  pagibig_number?: string | null;
  tin?: string | null;
  basic_salary?: string | null;
  pay_frequency: PayFrequency | null;
  shift_type: 'day' | 'evening' | 'night' | 'custom' | null;
  shift_start: string | null; // "HH:mm"
  shift_end: string | null;   // "HH:mm"
  work_days: string[] | null; // ["mon","tue","wed","thu","fri"]
  emergency_contact: EmergencyContact | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeListResponse {
  employees: Employee[];
  pagination: Pagination;
}

export interface EmployeeFilters {
  search?: string;
  department_id?: string;
  position_id?: string;
  employment_status?: EmploymentStatus;
  per_page?: number;
  page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

// ─── Department ───────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  employees_count?: number;
  employee_count?: number;
  parent_id: string | null;
  parent: { id: string; name: string } | null;
  head_user_id: string | null;
  head: { id: string; full_name: string } | null;
  positions?: Position[];
  children?: Department[];
  created_at: string;
  updated_at: string;
}

export interface DepartmentListResponse {
  departments: Department[];
  pagination?: Pagination;
}

// ─── Position ─────────────────────────────────────────────────────────────────

export interface Position {
  id: string;
  code: string;
  title: string;
  description: string | null;
  rank_level: number | null;
  min_salary: string | null;
  max_salary: string | null;
  is_active: boolean;
  employees_count?: number;
  employee_count?: number;
  department_id: string;
  department: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface PositionListResponse {
  positions: Position[];
  pagination?: Pagination;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

// ─── User Groups ──────────────────────────────────────────────────────────────

export type UserGroupType = 'department_head' | 'hr_admin' | 'custom';

export interface UserGroupMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  employee_number: string | null;
  added_by: string | null;
  added_at: string | null;
}

export interface UserGroupDepartment {
  id: string;
  name: string;
  code: string;
}

export interface UserGroupDirector {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  employee_number: string | null;
}

export interface UserGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: UserGroupType;
  is_active: boolean;
  members_count: number;
  department_ids: string[];
  departments: UserGroupDepartment[];
  members?: UserGroupMember[];
  director_id: string | null;
  director: UserGroupDirector | null;
  created_by: string | null;
  creator: { id: string; full_name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface UserGroupListResponse {
  groups: UserGroup[];
  pagination?: Pagination;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export type DocumentCategory =
  | 'contract'
  | 'id'
  | 'certificate'
  | 'medical'
  | 'memo'
  | 'other';

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  uploaded_by: string | null;
  uploader: { id: string; first_name: string; last_name: string } | null;
  category: DocumentCategory;
  title: string;
  description: string | null;
  file_name: string;
  mime_type: string;
  file_size: number;
  expires_at: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  documents: EmployeeDocument[];
  pagination: Pagination;
}

export interface DocumentFilters {
  search?: string;
  category?: DocumentCategory;
  per_page?: number;
  page?: number;
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogListResponse {
  audit_logs: AuditLog[];
  pagination: Pagination;
}

export interface AuditLogFilters {
  actor_id?: string;
  action?: string;
  target_type?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}


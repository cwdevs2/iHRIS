// JSend response envelope (mirrors backend App\Support\ApiResponse)

export interface JSendSuccess<T> {
  status: 'success';
  data: T;
}

export interface JSendFail<T = Record<string, unknown>> {
  status: 'fail';
  data: T;
}

export interface JSendError {
  status: 'error';
  message: string;
  code?: number;
  data?: unknown;
}

export type JSendEnvelope<T> = JSendSuccess<T> | JSendFail | JSendError;

// Domain types ---------------------------------------------------------------

export interface AuthRole {
  id: string;
  name: string;
  display_name: string;
  hierarchy_level: number;
}

/** A condensed group entry returned by the /auth/me endpoint. */
export interface AuthUserGroup {
  id: string;
  name: string;
  type: 'department_head' | 'hr_admin' | 'custom';
  /** Department IDs this group is scoped to manage. */
  department_ids: string[];
}

export interface AuthUser {
  id: string;
  employee_id: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: 'active' | 'inactive' | 'suspended';
  mfa_enabled: boolean;
  roles: AuthRole[];
  /** Format: `module.feature.action` (e.g. `hr.employees.view`). */
  permissions: string[];
  /** Groups the user belongs to, with department scope. */
  groups: AuthUserGroup[];
  last_login_at: string | null;
  created_at: string;
}

export interface LoginSuccessPayload {
  token: string;
  token_type: 'Bearer';
  user: AuthUser;
  mfa_required?: false;
}

export interface MfaChallengePayload {
  mfa_required: true;
  challenge_token: string;
}

export type LoginPayload = LoginSuccessPayload | MfaChallengePayload;

export interface MeResponse {
  user: AuthUser;
}

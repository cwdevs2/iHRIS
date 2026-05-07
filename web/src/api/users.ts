import { api, unwrap } from '@/lib/api';
import type { JSendEnvelope, SystemUser, UserListResponse, UserFilters } from '@/types';

// ─── Input Types ─────────────────────────────────────────────────────────────

export type CreateUserInput = {
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  email: string;
  phone?: string | null;
  password: string;
  status?: 'active' | 'inactive' | 'suspended';
  role_ids?: string[];
};

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>> & {
  password?: string | null;
  role_ids?: string[];
};

// ─── API client ───────────────────────────────────────────────────────────────

export const userApi = {
  list: (filters: UserFilters = {}): Promise<UserListResponse> =>
    unwrap(api.get<JSendEnvelope<UserListResponse>>('/users', { params: filters })),

  get: (id: string): Promise<{ user: SystemUser }> =>
    unwrap(api.get<JSendEnvelope<{ user: SystemUser }>>(`/users/${id}`)),

  create: (data: CreateUserInput): Promise<{ user: SystemUser }> =>
    unwrap(api.post<JSendEnvelope<{ user: SystemUser }>>('/users', data)),

  update: (id: string, data: UpdateUserInput): Promise<{ user: SystemUser }> =>
    unwrap(api.patch<JSendEnvelope<{ user: SystemUser }>>(`/users/${id}`, data)),

  delete: (id: string): Promise<void> =>
    unwrap(api.delete<JSendEnvelope<object>>(`/users/${id}`)),
};

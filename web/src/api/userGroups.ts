import { api, unwrap } from '@/lib/api';
import type {
  UserGroup,
  UserGroupListResponse,
} from '@/types';

export type CreateUserGroupInput = {
  name: string;
  description?: string | null;
  type: 'department_head' | 'hr_admin' | 'custom';
  is_active?: boolean;
  department_ids?: string[];
};

export type UpdateUserGroupInput = Partial<CreateUserGroupInput>;

export const userGroupApi = {
  list(params?: {
    all?: boolean;
    search?: string;
    type?: string;
    is_active?: boolean;
    department_id?: string;
    per_page?: number;
    page?: number;
  }): Promise<UserGroupListResponse> {
    return unwrap(api.get('/user-groups', { params }));
  },

  get(id: string): Promise<{ group: UserGroup }> {
    return unwrap(api.get(`/user-groups/${id}`));
  },

  create(data: CreateUserGroupInput): Promise<{ group: UserGroup }> {
    return unwrap(api.post('/user-groups', data));
  },

  update(id: string, data: UpdateUserGroupInput): Promise<{ group: UserGroup }> {
    return unwrap(api.patch(`/user-groups/${id}`, data));
  },

  delete(id: string): Promise<{ message: string }> {
    return unwrap(api.delete(`/user-groups/${id}`));
  },

  addMember(groupId: string, userId: string): Promise<{ group: UserGroup }> {
    return unwrap(api.post(`/user-groups/${groupId}/members`, { user_id: userId }));
  },

  removeMember(groupId: string, userId: string): Promise<{ group: UserGroup }> {
    return unwrap(api.delete(`/user-groups/${groupId}/members/${userId}`));
  },
};

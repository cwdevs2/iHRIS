import { create } from 'zustand';
import type { AuthUser } from '@/types/api';
import { tokenStorage } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  isHydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  hydrate: (user: AuthUser) => void;
  reset: () => void;
  hasPermission: (key: string) => boolean;
  hasAnyRole: (...names: string[]) => boolean;
  /**
   * Returns the list of department IDs the user is scoped to via their groups.
   * An empty array means the user has no group scope (treat as "no delegated access").
   * Users with global HR permissions bypass this entirely in the API.
   */
  scopedDepartmentIds: () => string[];
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isHydrated: false,

  setUser: (user) => set({ user }),

  setToken: (token) => {
    if (token) tokenStorage.set(token);
    else tokenStorage.clear();
  },

  hydrate: (user) => set({ user, isHydrated: true }),

  reset: () => {
    tokenStorage.clear();
    set({ user: null, isHydrated: true });
  },

  hasPermission: (key) => {
    const user = get().user;
    return user?.permissions.includes(key) ?? false;
  },

  hasAnyRole: (...names) => {
    const user = get().user;
    if (!user) return false;
    return user.roles.some((r) => names.includes(r.name));
  },

  scopedDepartmentIds: () => {
    const user = get().user;
    if (!user?.groups?.length) return [];
    const ids = user.groups.flatMap((g) => g.department_ids);
    return [...new Set(ids)];
  },
}));

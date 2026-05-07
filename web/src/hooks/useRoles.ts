import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import type { JSendEnvelope } from '@/types';

export interface SystemRole {
  id: string;
  name: string;
  display_name: string;
  hierarchy_level: number;
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () =>
      unwrap(api.get<JSendEnvelope<{ roles: SystemRole[] }>>('/roles')).then((d) => d.roles),
    staleTime: 5 * 60 * 1000, // roles change infrequently
  });
}

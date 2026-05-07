import { useQuery } from '@tanstack/react-query';
import { auditLogApi } from '@/api/hr';
import type { AuditLogFilters } from '@/types';

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: AuditLogFilters) => [...auditLogKeys.lists(), filters] as const,
};

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: () => auditLogApi.list(filters),
  });
}

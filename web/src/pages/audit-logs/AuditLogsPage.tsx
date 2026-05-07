import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import type { AuditLog, AuditLogFilters } from '@/types';

// Derive a short, human-readable label from the raw action string.
function actionLabel(action: string): string {
  return action
    .replace(/\./g, ' › ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Map common action prefixes to badge colours.
function actionVariant(action: string): 'default' | 'success' | 'danger' | 'warning' | 'info' | 'brand' {
  if (action.includes('login') || action.includes('auth')) return 'brand';
  if (action.includes('create') || action.includes('store')) return 'success';
  if (action.includes('delete') || action.includes('destroy') || action.includes('archive')) return 'danger';
  if (action.includes('update') || action.includes('edit') || action.includes('patch')) return 'warning';
  if (action.includes('view') || action.includes('export') || action.includes('download')) return 'info';
  return 'default';
}

// Shorten the fully-qualified class name to the model name only.
function targetLabel(targetType: string | null): string | null {
  if (!targetType) return null;
  const parts = targetType.split('\\');
  return parts[parts.length - 1] ?? targetType;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOutStrong } },
};

export function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({ per_page: 25, page: 1 });
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useAuditLogs({
    ...filters,
    action: search || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const logs = data?.audit_logs ?? [];
  const pagination = data?.pagination;

  function applySearch(value: string) {
    setSearch(value);
    setFilters((f) => ({ ...f, page: 1 }));
  }

  function applyDates(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
    setFilters((f) => ({ ...f, page: 1 }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-surface-900">Audit Logs</h1>
        <p className="text-sm text-surface-500">Append-only record of every system mutation.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Filter by action…"
            value={search}
            onChange={(e) => applySearch(e.target.value)}
            className={cn(
              'h-9 w-full rounded-lg border border-surface-200 bg-surface-0',
              'pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400',
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-surface-500 whitespace-nowrap">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => applyDates(e.target.value, dateTo)}
            className={cn(
              'h-9 rounded-lg border border-surface-200 bg-surface-0',
              'px-3 text-sm text-surface-900',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400',
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-surface-500 whitespace-nowrap">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => applyDates(dateFrom, e.target.value)}
            className={cn(
              'h-9 rounded-lg border border-surface-200 bg-surface-0',
              'px-3 text-sm text-surface-900',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400',
            )}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-surface-400 text-sm">
              Loading…
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-surface-700">No audit log entries yet</p>
              <p className="text-xs text-surface-400 max-w-xs">
                Every write operation is recorded here as it happens.
              </p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                      Actor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                      IP
                    </th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                  {logs.map((log: AuditLog) => (
                    <motion.tr
                      key={log.id}
                      variants={rowVariants}
                      className="border-b border-surface-50 last:border-0 hover:bg-surface-50 transition-colors duration-100"
                    >
                      <td className="px-4 py-3 text-xs text-surface-500 whitespace-nowrap">
                        <span title={log.created_at}>
                          {dayjs(log.created_at).format('MMM D, YYYY HH:mm:ss')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-surface-900 text-xs">
                            {log.actor_name ?? '—'}
                          </span>
                          <span className="text-xs text-surface-400">{log.actor_email ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={actionVariant(log.action)}>
                          {actionLabel(log.action)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {log.target_type ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-surface-700">
                              {targetLabel(log.target_type)}
                            </span>
                            {log.target_id && (
                              <span className="text-xs text-surface-400 font-mono">
                                {log.target_id.slice(0, 8)}…
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-surface-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-500 font-mono whitespace-nowrap">
                        {log.ip_address ?? '—'}
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>

              {/* Pagination */}
              {pagination && pagination.last_page > 1 && (
                <div className="flex items-center justify-between border-t border-surface-100 px-4 py-3">
                  <p className="text-xs text-surface-500">
                    {pagination.total} total records · page {pagination.current_page} of {pagination.last_page}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={pagination.current_page <= 1}
                      onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-surface-200 text-surface-500 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      disabled={pagination.current_page >= pagination.last_page}
                      onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-surface-200 text-surface-500 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

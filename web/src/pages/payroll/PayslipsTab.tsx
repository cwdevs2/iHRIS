import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Receipt, ExternalLink } from 'lucide-react';
import dayjs from 'dayjs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { payslipApi } from '@/api/payroll';
import { formatPeso } from '@/lib/money';

export function PayslipsTab() {
  const [filters, setFilters] = useState<{ status?: string; per_page: number; page: number }>({ per_page: 25, page: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', 'payslips', 'list', filters],
    queryFn: () => payslipApi.list(filters),
  });

  const payslips = data?.payslips ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value || undefined, page: 1 }))}
          className="input-field h-10 w-[180px]"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="paid">Paid</option>
        </select>

        <span className="ml-auto text-sm text-surface-500">
          {data?.pagination ? `${data.pagination.total} payslips` : 'Loading…'}
        </span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Deductions</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Net</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-3/4 animate-pulse rounded bg-surface-100" /></td>
                    ))}
                  </tr>
                ))
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                        <Receipt className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-surface-900">No payslips found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payslips.map((ps) => (
                  <tr key={ps.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-surface-900">{ps.employee?.full_name ?? '—'}</p>
                      <p className="text-xs text-surface-500">{ps.employee?.employee_number}</p>
                    </td>
                    <td className="px-4 py-3 text-surface-700 text-xs">
                      {ps.generated_at ? dayjs(ps.generated_at).format('MMM D, YYYY') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ps.status === 'paid' ? 'success' : ps.status === 'finalized' ? 'info' : 'warning'}>
                        {ps.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(ps.gross_earnings)}</td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(ps.total_deductions)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-surface-900 tabular-nums">{formatPeso(ps.net_pay)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/payroll/payslips/${ps.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 cursor-pointer"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

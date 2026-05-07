import { useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, Banknote, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PayrollRunStatusBadge } from '@/components/payroll/PayrollRunStatusBadge';
import { usePayrollRuns, useCreatePayrollRun, usePayrollPeriods } from '@/hooks/usePayroll';
import { useAuthStore } from '@/stores/auth';
import { formatPeso } from '@/lib/money';
import type { PayrollRunFilters } from '@/types';
import { motion } from 'framer-motion';

export function RunsTab() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('payroll.runs.create');

  const [filters, setFilters] = useState<PayrollRunFilters>({ per_page: 25 });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [notes, setNotes] = useState('');

  const { data, isLoading } = usePayrollRuns(filters);
  const { data: periodData } = usePayrollPeriods({ per_page: 100, status: 'open' });
  const createRun = useCreatePayrollRun();

  const runs = data?.runs ?? [];
  const periods = periodData?.periods ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, status: (e.target.value || undefined) as PayrollRunFilters['status'] }))}
          className="input-field h-10 w-[180px]"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="paid">Paid</option>
          <option value="canceled">Canceled</option>
        </select>

        <span className="ml-auto text-sm text-surface-500">
          {data?.pagination ? `${data.pagination.total} runs` : 'Loading…'}
        </span>

        {canCreate ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New run
          </Button>
        ) : null}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Headcount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Net</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-3/4 animate-pulse rounded bg-surface-100" /></td>
                    ))}
                  </tr>
                ))
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                        <Banknote className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-900">No payroll runs yet</p>
                        <p className="mt-0.5 text-xs text-surface-500">Create a run against an open period to begin.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-surface-900">{r.reference_number}</td>
                    <td className="px-4 py-3 text-surface-700">
                      {r.period ? `${dayjs(r.period.period_start).format('MMM D')} – ${dayjs(r.period.period_end).format('MMM D, YYYY')}` : '—'}
                    </td>
                    <td className="px-4 py-3"><PayrollRunStatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{r.headcount}</td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(r.total_gross)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-surface-900 tabular-nums">{formatPeso(r.total_net)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/payroll/runs/${r.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 cursor-pointer"
                      >
                        View
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md rounded-2xl bg-surface-0 p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-surface-900">Create payroll run</h3>
            <p className="mt-1 text-xs text-surface-500">A draft run will be created. You can then generate payslips against it.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="input-field mt-1.5"
                >
                  <option value="">Select an open period…</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {periods.length === 0 ? (
                  <p className="mt-1 text-xs text-surface-500">No open periods. Create one first under the Periods tab.</p>
                ) : null}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field mt-1.5"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                disabled={!selectedPeriod}
                loading={createRun.isPending}
                onClick={async () => {
                  await createRun.mutateAsync({ payroll_period_id: selectedPeriod, scope: 'company', notes: notes || null });
                  setCreateOpen(false);
                  setSelectedPeriod('');
                  setNotes('');
                }}
              >
                Create draft
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

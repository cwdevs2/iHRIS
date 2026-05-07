import { useState } from 'react';
import dayjs from 'dayjs';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PayrollPeriodFormModal } from '@/components/payroll/PayrollPeriodFormModal';
import { usePayrollPeriods, useDeletePayrollPeriod } from '@/hooks/usePayroll';
import { useAuthStore } from '@/stores/auth';
import type { PayrollPeriod } from '@/types';

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'info'> = {
  open: 'info',
  processing: 'warning',
  closed: 'success',
};

const FREQUENCY_LABEL: Record<string, string> = {
  semi_monthly: 'Semi-monthly',
  monthly: 'Monthly',
  weekly: 'Weekly',
  bi_weekly: 'Bi-weekly',
};

export function PeriodsTab() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('payroll.periods.manage');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollPeriod | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayrollPeriod | null>(null);

  const { data, isLoading } = usePayrollPeriods({ per_page: 50 });
  const deletePeriod = useDeletePayrollPeriod();

  const periods = data?.periods ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-500">
          {data?.pagination ? `${data.pagination.total} periods` : 'Loading…'}
        </p>
        {canManage ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setModalOpen(true); }}>
            New period
          </Button>
        ) : null}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Pay date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Runs</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-3/4 animate-pulse rounded bg-surface-100" /></td>
                    ))}
                  </tr>
                ))
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-900">No payroll periods yet</p>
                        <p className="mt-0.5 text-xs text-surface-500">Create one to start running payroll.</p>
                      </div>
                      {canManage ? (
                        <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setEditing(null); setModalOpen(true); }}>
                          Create period
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-surface-900">{p.name}</td>
                    <td className="px-4 py-3 text-surface-700">{FREQUENCY_LABEL[p.frequency]}</td>
                    <td className="px-4 py-3 text-surface-700">
                      {dayjs(p.period_start).format('MMM D')} – {dayjs(p.period_end).format('MMM D, YYYY')}
                    </td>
                    <td className="px-4 py-3 text-surface-700">
                      {p.pay_date ? dayjs(p.pay_date).format('MMM D, YYYY') : '—'}
                    </td>
                    <td className="px-4 py-3"><Badge variant={STATUS_VARIANTS[p.status]}>{p.status}</Badge></td>
                    <td className="px-4 py-3 text-surface-700">{p.runs_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              onClick={() => { setEditing(p); setModalOpen(true); }}
                              className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors"
                              aria-label="Edit period"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(p)}
                              className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              aria-label="Delete period"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <PayrollPeriodFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        period={editing}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-surface-0 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-surface-900">Delete period?</h3>
            <p className="mt-2 text-sm text-surface-600">
              Delete <strong>{deleteTarget.name}</strong>? Periods with attached runs cannot be deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                variant="danger"
                loading={deletePeriod.isPending}
                onClick={async () => {
                  await deletePeriod.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

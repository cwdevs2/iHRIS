import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { ArrowLeft, Play, Lock, Ban, Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PayrollRunStatusBadge } from '@/components/payroll/PayrollRunStatusBadge';
import {
  usePayrollRun,
  useGeneratePayslips,
  useFinalizePayrollRun,
  useMarkRunPaid,
  useCancelRun,
} from '@/hooks/usePayroll';
import { useAuthStore } from '@/stores/auth';
import { formatPeso } from '@/lib/money';
import { easeOutStrong } from '@/lib/motion';

export function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const canGenerate = hasPermission('payroll.runs.edit');
  const canFinalize = hasPermission('payroll.runs.finalize');
  const canMarkPaid = hasPermission('payroll.runs.mark_paid');
  const canCancel = hasPermission('payroll.runs.cancel');

  const { data, isLoading } = usePayrollRun(id);
  const generate = useGeneratePayslips(id ?? '');
  const finalize = useFinalizePayrollRun();
  const markPaid = useMarkRunPaid();
  const cancel = useCancelRun();

  const run = data?.run;

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!run) return null;

  const isLocked = run.status === 'finalized' || run.status === 'paid' || run.status === 'canceled';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      <div>
        <Link to="/payroll" className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-surface-900 cursor-pointer">
          <ArrowLeft className="h-3 w-3" />
          Back to Payroll
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-surface-900">{run.reference_number}</h1>
            <PayrollRunStatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-sm text-surface-500">
            {run.period
              ? `${dayjs(run.period.period_start).format('MMM D')} – ${dayjs(run.period.period_end).format('MMM D, YYYY')} · ${run.period.frequency.replace('_', ' ')}`
              : 'No period attached'}
          </p>
          {run.notes ? <p className="mt-2 max-w-prose text-sm text-surface-600">{run.notes}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {!isLocked && canGenerate ? (
            <Button
              leftIcon={<Play className="h-4 w-4" />}
              loading={generate.isPending}
              onClick={() => generate.mutate({ effective_year: dayjs().year() })}
            >
              {run.headcount > 0 ? 'Regenerate payslips' : 'Generate payslips'}
            </Button>
          ) : null}

          {run.status === 'draft' && canFinalize && run.headcount > 0 ? (
            <Button
              variant="cta"
              leftIcon={<Lock className="h-4 w-4" />}
              loading={finalize.isPending}
              onClick={() => finalize.mutate(run.id)}
            >
              Finalize
            </Button>
          ) : null}

          {run.status === 'finalized' && canMarkPaid ? (
            <Button
              variant="cta"
              leftIcon={<Check className="h-4 w-4" />}
              loading={markPaid.isPending}
              onClick={() => markPaid.mutate(run.id)}
            >
              Mark as paid
            </Button>
          ) : null}

          {run.status === 'draft' && canCancel ? (
            <Button
              variant="ghost"
              leftIcon={<Ban className="h-4 w-4" />}
              loading={cancel.isPending}
              onClick={async () => {
                await cancel.mutateAsync(run.id);
                navigate('/payroll');
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Headcount" value={run.headcount.toString()} />
        <SummaryCard label="Gross" value={formatPeso(run.total_gross)} tone="info" />
        <SummaryCard label="Deductions" value={formatPeso(run.total_deductions)} tone="warning" />
        <SummaryCard label="Net pay" value={formatPeso(run.total_net)} tone="success" />
      </div>

      {/* Payslips table */}
      <Card>
        <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4">
          <h2 className="text-base font-semibold text-surface-900">Payslips</h2>
          <Badge variant="default">{run.payslips?.length ?? 0} entries</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Employee</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">SSS</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">PHIC</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">HDMF</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Tax</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Net</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(run.payslips ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-surface-500">
                    No payslips yet. Click "Generate payslips" to compute them for in-scope employees.
                  </td>
                </tr>
              ) : (
                (run.payslips ?? []).map((ps, idx) => (
                  <tr key={ps.id} className={idx % 2 === 1 ? 'bg-surface-50/40 hover:bg-surface-50' : 'hover:bg-surface-50'}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-surface-900">{ps.employee?.full_name}</p>
                      <p className="text-xs text-surface-500">{ps.employee?.employee_number} · {ps.employee?.department ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(ps.gross_earnings)}</td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(ps.sss_employee, { showSymbol: false })}</td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(ps.philhealth_employee, { showSymbol: false })}</td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(ps.pagibig_employee, { showSymbol: false })}</td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(ps.withholding_tax, { showSymbol: false })}</td>
                    <td className="px-4 py-3 text-right font-semibold text-surface-900 tabular-nums">{formatPeso(ps.net_pay)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/payroll/payslips/${ps.id}`} className="text-xs font-medium text-brand-700 hover:text-brand-800 cursor-pointer">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-xs text-surface-500 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>Generated by: {run.generated_by?.name ?? '—'} on {run.generated_at ? dayjs(run.generated_at).format('MMM D, YYYY h:mm A') : '—'}</div>
        <div>Finalized by: {run.finalized_by?.name ?? '—'} {run.finalized_at ? `on ${dayjs(run.finalized_at).format('MMM D, YYYY h:mm A')}` : ''}</div>
      </div>
    </motion.div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'info' | 'warning' }) {
  const accent = tone === 'success' ? 'text-cta-700' : tone === 'info' ? 'text-brand-700' : tone === 'warning' ? 'text-amber-700' : 'text-surface-900';
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </Card>
  );
}

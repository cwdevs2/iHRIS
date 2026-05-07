import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePayslip } from '@/hooks/usePayroll';
import { payslipApi } from '@/api/payroll';
import { tokenStorage } from '@/lib/api';
import { formatPeso } from '@/lib/money';
import { easeOutStrong } from '@/lib/motion';

export function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = usePayslip(id);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  const ps = data?.payslip;
  if (!ps) return null;

  const earnings = (ps.items ?? []).filter((i) => i.category.startsWith('earning_'));
  const deductions = (ps.items ?? []).filter((i) => i.category.startsWith('deduction_'));

  const openDocument = async () => {
    // Bearer token must be sent as a header — we open in a popup window after fetch.
    const url = payslipApi.documentUrl(ps.id);
    const token = tokenStorage.get();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const html = await res.text();
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (win) {
      win.document.write(html);
      win.document.close();
      // Auto-focus the print dialog after a beat so the user can save as PDF
      setTimeout(() => win.print(), 400);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      <div>
        <Link to={`/payroll/runs/${ps.payroll_run_id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-surface-900 cursor-pointer">
          <ArrowLeft className="h-3 w-3" />
          Back to run
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Payslip</h1>
          <p className="mt-0.5 text-sm text-surface-500">
            {ps.employee?.full_name} ({ps.employee?.employee_number})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ps.status === 'paid' ? 'success' : ps.status === 'finalized' ? 'info' : 'warning'}>
            {ps.status}
          </Badge>
          <Button variant="outline" leftIcon={<Printer className="h-4 w-4" />} onClick={openDocument}>
            Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">Gross earnings</p>
          <p className="mt-1 text-2xl font-semibold text-brand-700 tabular-nums">{formatPeso(ps.gross_earnings)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">Deductions</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700 tabular-nums">{formatPeso(ps.total_deductions)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">Net pay</p>
          <p className="mt-1 text-2xl font-semibold text-cta-700 tabular-nums">{formatPeso(ps.net_pay)}</p>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Earnings */}
        <Card>
          <div className="border-b border-surface-100 px-6 py-4">
            <h2 className="text-base font-semibold text-surface-900">Earnings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Description</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Rate</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 1 ? 'bg-surface-50/40' : ''}>
                    <td className="px-4 py-2 text-surface-900">
                      {item.label}
                      {!item.is_taxable ? <Badge variant="default" className="ml-2">non-taxable</Badge> : null}
                    </td>
                    <td className="px-4 py-2 text-right text-surface-700 tabular-nums">{Number(item.quantity).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-surface-700 tabular-nums">{formatPeso(item.rate, { showSymbol: false })}</td>
                    <td className="px-4 py-2 text-right text-surface-900 tabular-nums">{formatPeso(item.amount, { showSymbol: false })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-300 font-semibold">
                  <td colSpan={3} className="px-4 py-3 text-surface-900">Gross</td>
                  <td className="px-4 py-3 text-right text-surface-900 tabular-nums">{formatPeso(ps.gross_earnings, { showSymbol: false })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Deductions */}
        <Card>
          <div className="border-b border-surface-100 px-6 py-4">
            <h2 className="text-base font-semibold text-surface-900">Deductions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Description</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Code</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {deductions.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 1 ? 'bg-surface-50/40' : ''}>
                    <td className="px-4 py-2 text-surface-900">{item.label}</td>
                    <td className="px-4 py-2 text-xs text-surface-500">{item.code}</td>
                    <td className="px-4 py-2 text-right text-surface-900 tabular-nums">{formatPeso(item.amount, { showSymbol: false })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-300 font-semibold">
                  <td colSpan={2} className="px-4 py-3 text-surface-900">Total deductions</td>
                  <td className="px-4 py-3 text-right text-surface-900 tabular-nums">{formatPeso(ps.total_deductions, { showSymbol: false })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-4 text-sm">
          <Field label="Pay frequency" value={ps.pay_frequency} />
          <Field label="Daily rate" value={formatPeso(ps.daily_rate)} />
          <Field label="Hourly rate" value={formatPeso(ps.hourly_rate)} />
          <Field label="Generated" value={ps.generated_at ? dayjs(ps.generated_at).format('MMM D, YYYY h:mm A') : '—'} />
        </div>
      </Card>
    </motion.div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">{label}</p>
      <p className="mt-1 text-sm text-surface-900">{value}</p>
    </div>
  );
}

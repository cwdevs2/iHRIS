import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { Receipt, ExternalLink, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useOwnPayslips } from '@/hooks/usePayroll';
import { formatPeso } from '@/lib/money';
import { easeOutStrong } from '@/lib/motion';

/** ESS view — an employee sees their own payslips here. */
export function MyPayslipsPage() {
  const { data, isLoading } = useOwnPayslips();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-surface-900">My Payslips</h1>
        <p className="mt-0.5 text-sm text-surface-500">View and download your finalized payslips.</p>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : (data?.payslips?.length ?? 0) === 0 ? (
        <Card>
          <div className="grid place-items-center px-6 py-16">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400 mb-3">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-surface-900">No payslips yet</p>
            <p className="mt-0.5 text-xs text-surface-500">Your payslips will appear here once a payroll run is finalized.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Pay date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Gross</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Deductions</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Net</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(data?.payslips ?? []).map((ps, idx) => (
                  <tr key={ps.id} className={idx % 2 === 1 ? 'bg-surface-50/40 hover:bg-surface-50' : 'hover:bg-surface-50'}>
                    <td className="px-4 py-3 text-surface-900 font-medium">
                      {ps.generated_at ? dayjs(ps.generated_at).format('MMM D, YYYY') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ps.status === 'paid' ? 'success' : 'info'}>{ps.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(ps.gross_earnings)}</td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(ps.total_deductions)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-surface-900 tabular-nums">{formatPeso(ps.net_pay)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/payroll/payslips/${ps.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 cursor-pointer">
                        View
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </motion.div>
  );
}

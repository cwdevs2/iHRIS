import { useState } from 'react';
import dayjs from 'dayjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { usePayrollRegisterReport } from '@/hooks/useReports';

const peso = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ReportPayrollRegister() {
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const { data, isLoading } = usePayrollRegisterReport(from, to);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-surface-900">Payroll Register</h2>
          <p className="text-sm text-surface-500">Per-employee earnings, deductions, and net pay for the period.</p>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-surface-600">From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-surface-600">To</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </label>
        </div>
      </div>

      {isLoading && <p className="text-sm text-surface-500">Loading…</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Payslips" value={String(data.totals.count)} />
            <Tile label="Total gross" value={peso(data.totals.gross_earnings)} />
            <Tile label="Total deductions" value={peso(data.totals.total_deductions)} />
            <Tile label="Total net" value={peso(data.totals.net_pay)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detail</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-surface-200 text-left text-xs uppercase tracking-wide text-surface-500">
                  <tr>
                    <th className="px-3 py-2">Employee #</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2 text-right">Gross</th>
                    <th className="px-3 py-2 text-right">Deductions</th>
                    <th className="px-3 py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-surface-500">
                        No payslips in this range.
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row, i) => (
                      <tr key={i} className="border-b border-surface-100 last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{row.employee_number ?? '—'}</td>
                        <td className="px-3 py-2">{row.employee_name || '—'}</td>
                        <td className="px-3 py-2 text-right font-mono">{peso(row.gross_earnings)}</td>
                        <td className="px-3 py-2 text-right font-mono">{peso(row.total_deductions)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-surface-900">{peso(row.net_pay)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-200 bg-surface-0 p-4">
      <p className="text-xs uppercase tracking-wide text-surface-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-surface-900">{value}</p>
    </div>
  );
}

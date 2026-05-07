import { useState } from 'react';
import dayjs from 'dayjs';
import { FileBarChart2, Download, Calendar, Banknote } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useSssReport,
  usePhilhealthReport,
  usePagibigReport,
  useBirAlphaList,
  useThirteenthMonth,
} from '@/hooks/usePayroll';
import { formatPeso } from '@/lib/money';

type ReportKey = 'sss' | 'philhealth' | 'pagibig' | 'bir' | 'thirteenth';

const REPORT_OPTIONS: Array<{ key: ReportKey; label: string; description: string }> = [
  { key: 'sss', label: 'SSS R-3', description: 'Contribution Collection List' },
  { key: 'philhealth', label: 'PhilHealth RF-1', description: 'Employer Remittance Report' },
  { key: 'pagibig', label: 'Pag-IBIG MCRF', description: 'Member Contribution Remittance' },
  { key: 'bir', label: 'BIR Alpha List', description: 'Annual Compensation Summary' },
  { key: 'thirteenth', label: '13th-Month Pay', description: 'Annual entitlement preview' },
];

export function ReportsTab() {
  const today = dayjs();
  const [report, setReport] = useState<ReportKey>('sss');
  const [dateFrom, setDateFrom] = useState(today.startOf('month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(today.endOf('month').format('YYYY-MM-DD'));
  const [year, setYear] = useState(today.year());

  const params = report === 'sss' || report === 'philhealth' || report === 'pagibig' ? { date_from: dateFrom, date_to: dateTo } : null;
  const sss = useSssReport(report === 'sss' ? params : null);
  const phic = usePhilhealthReport(report === 'philhealth' ? params : null);
  const hdmf = usePagibigReport(report === 'pagibig' ? params : null);
  const bir = useBirAlphaList(report === 'bir' ? year : null);
  const tm = useThirteenthMonth(report === 'thirteenth' ? year : null);

  const data = report === 'sss' ? sss.data : report === 'philhealth' ? phic.data : report === 'pagibig' ? hdmf.data : report === 'bir' ? bir.data : null;
  const tmData = report === 'thirteenth' ? tm.data : null;
  const isLoading = sss.isLoading || phic.isLoading || hdmf.isLoading || bir.isLoading || tm.isLoading;

  const downloadCsv = () => {
    let rows: Array<Record<string, unknown>> = [];
    if (report === 'thirteenth' && tmData) rows = tmData.rows as unknown as Array<Record<string, unknown>>;
    else if (data) rows = data.rows;
    if (rows.length === 0) return;

    const cols = Object.keys(rows[0]);
    const csv = [
      cols.join(','),
      ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report}-report-${dayjs().format('YYYYMMDD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Report</label>
          <select value={report} onChange={(e) => setReport(e.target.value as ReportKey)} className="input-field mt-1.5 h-10 w-[260px]">
            {REPORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label} — {o.description}</option>
            ))}
          </select>
        </div>

        {(report === 'sss' || report === 'philhealth' || report === 'pagibig') ? (
          <>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field mt-1.5 h-10" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field mt-1.5 h-10" />
            </div>
          </>
        ) : (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field mt-1.5 h-10 w-[120px]" />
          </div>
        )}

        <Button leftIcon={<Download className="h-4 w-4" />} variant="outline" onClick={downloadCsv} className="ml-auto">
          Export CSV
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="grid place-items-center py-16">
            <div className="text-sm text-surface-500">Loading report…</div>
          </div>
        ) : report === 'thirteenth' ? (
          <ThirteenthTable data={tmData ? { year: tmData.year, rows: tmData.rows as unknown as Array<Record<string, unknown>>, totals: tmData.totals } : null} />
        ) : data ? (
          <ReportTable rows={data.rows} totals={data.totals} />
        ) : (
          <div className="grid place-items-center py-16">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400 mb-3">
              <FileBarChart2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-surface-900">Select report parameters to load data</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function ReportTable({ rows, totals }: { rows: Array<Record<string, unknown>>; totals: Record<string, number> }) {
  if (rows.length === 0) {
    return (
      <div className="grid place-items-center py-16">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400 mb-3">
          <Calendar className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-surface-900">No data for the selected range</p>
        <p className="mt-0.5 text-xs text-surface-500">Try a different date range or check that runs are finalized.</p>
      </div>
    );
  }

  const cols = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-100">
            {cols.map((c) => (
              <th key={c} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">
                {c.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
              {cols.map((c) => (
                <td key={c} className="px-4 py-3 text-surface-700 tabular-nums">
                  {typeof r[c] === 'number' ? formatPeso(r[c] as number, { showSymbol: false }) : (r[c] as string ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-surface-50 font-semibold">
            <td colSpan={Math.max(cols.length - Object.keys(totals).length, 1)} className="px-4 py-3 text-surface-900">Totals</td>
            {Object.entries(totals).map(([k, v]) => (
              <td key={k} className="px-4 py-3 text-right text-surface-900 tabular-nums">{formatPeso(v, { showSymbol: false })}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ThirteenthTable({ data }: { data: { year: number; rows: Array<Record<string, unknown>>; totals: { thirteenth_month: number; taxable_excess: number } } | null | undefined }) {
  if (!data) return null;
  if (data.rows.length === 0) {
    return (
      <div className="grid place-items-center py-16">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400 mb-3">
          <Banknote className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-surface-900">No 13th-month entitlements yet</p>
        <p className="mt-0.5 text-xs text-surface-500">Finalize a payroll run to populate the basis.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-100">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Department</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Basic total</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">13th-month</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Taxable excess</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} className="border-b border-surface-50">
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-surface-900">{(r.name as string) ?? '—'}</p>
                <p className="text-xs text-surface-500">{r.employee_number as string}</p>
              </td>
              <td className="px-4 py-3 text-surface-700">{(r.department as string) ?? '—'}</td>
              <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(r.basic_total as number)}</td>
              <td className="px-4 py-3 text-right font-semibold text-surface-900 tabular-nums">{formatPeso(r.thirteenth_month as number)}</td>
              <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(r.taxable_excess as number)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-surface-50 font-semibold">
            <td colSpan={3} className="px-4 py-3 text-surface-900">Totals</td>
            <td className="px-4 py-3 text-right text-surface-900 tabular-nums">{formatPeso(data.totals.thirteenth_month)}</td>
            <td className="px-4 py-3 text-right text-surface-900 tabular-nums">{formatPeso(data.totals.taxable_excess)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAttendanceReport } from '@/hooks/useReports';

export function ReportAttendance() {
  const [from, setFrom] = useState(dayjs().subtract(13, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const { data, isLoading } = useAttendanceReport(from, to);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-surface-900">Attendance Summary</h2>
          <p className="text-sm text-surface-500">Daily presence, late, undertime &amp; OT.</p>
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
            <Tile label="Days covered" value={data.totals.days_covered} />
            <Tile label="Late instances" value={data.totals.total_late} />
            <Tile label="Undertime" value={data.totals.total_undertime} />
            <Tile label="OT hours" value={data.totals.total_overtime_hours} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer>
                  <BarChart data={data.daily} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="present" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="undertime" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-surface-200 bg-surface-0 p-4">
      <p className="text-xs uppercase tracking-wide text-surface-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-surface-900">{value}</p>
    </div>
  );
}

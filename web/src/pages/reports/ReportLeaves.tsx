import { useState } from 'react';
import dayjs from 'dayjs';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useLeaveReport } from '@/hooks/useReports';

const COLORS = ['#1E40AF', '#3B82F6', '#F59E0B', '#10B981', '#A855F7', '#EF4444', '#06B6D4'];

export function ReportLeaves() {
  const [from, setFrom] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const { data, isLoading } = useLeaveReport(from, to);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-surface-900">Leave Utilization</h2>
          <p className="text-sm text-surface-500">Approved leaves by type and current request status.</p>
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Days Used by Leave Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer>
                  <BarChart data={data.by_type} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" stroke="#64748B" fontSize={12} />
                    <YAxis dataKey="leave_type" type="category" stroke="#64748B" fontSize={12} width={120} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="total_days" radius={[0, 4, 4, 0]}>
                      {data.by_type.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {data.by_status.map((row) => (
                  <div key={row.status} className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-surface-500">{row.status}</p>
                    <p className="mt-1 font-mono text-2xl font-semibold text-surface-900">{row.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

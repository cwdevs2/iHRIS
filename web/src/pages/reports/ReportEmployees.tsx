import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useEmployeeReport } from '@/hooks/useReports';

const COLORS = ['#1E40AF', '#3B82F6', '#F59E0B', '#10B981', '#A855F7', '#EF4444'];

export function ReportEmployees() {
  const { data, isLoading } = useEmployeeReport();

  const departmentData = useMemo(() => data?.by_department ?? [], [data]);
  const trend = useMemo(() => data?.trend ?? [], [data]);

  if (isLoading) return <p className="text-sm text-surface-500">Loading headcount report…</p>;
  if (!data) return <p className="text-sm text-surface-500">No data available.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-surface-900">Headcount &amp; Turnover</h2>
        <p className="text-sm text-surface-500">
          Period: {data.date_range.from} → {data.date_range.to} · Annualized turnover:{' '}
          <span className="font-mono font-semibold text-surface-900">{data.turnover_rate_annualized}%</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Headcount by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer>
                <BarChart data={departmentData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="department" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {departmentData.map((_, i) => (
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
            <CardTitle>Hires vs Separations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer>
                <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="hires" stroke="#10B981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="separations" stroke="#EF4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Employment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {data.by_status.map((row) => (
              <div key={row.status} className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                <p className="text-xs uppercase tracking-wide text-surface-500">{row.status.replace(/_/g, ' ')}</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-surface-900">{row.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

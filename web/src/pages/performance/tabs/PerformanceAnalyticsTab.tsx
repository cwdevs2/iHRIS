import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { usePerformanceAnalytics, useCycles } from '@/hooks/usePerformance';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const BAND_COLORS: Record<string, string> = {
  Outstanding: '#22C55E',
  'Exceeds Expectations': '#84CC16',
  'Meets Expectations': '#3B82F6',
  'Below Expectations': '#F59E0B',
  Unsatisfactory: '#EF4444',
};

export function PerformanceAnalyticsTab() {
  const [cycleId, setCycleId] = useState<string>('');
  const { data: analyticsData, isLoading } = usePerformanceAnalytics(cycleId || undefined);
  const { data: cyclesData } = useCycles({ per_page: 100 });

  const cycles = cyclesData?.cycles ?? [];
  const analytics = analyticsData;

  const scoreDistribution = analytics?.score_distribution ?? [];
  const topPerformers = analytics?.top_performers ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Cycle Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-surface-700">Filter by Cycle:</label>
        <select
          className="input-field h-9 w-[240px]"
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
        >
          <option value="">All Cycles</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Avg Score', value: analytics?.avg_score?.toFixed(2) },
          { label: 'Submitted', value: analytics?.submitted_reviews },
          { label: 'Pending', value: analytics?.pending_reviews },
          { label: 'Active Cycles', value: analytics?.active_cycles },
          { label: 'Goals On Track', value: analytics?.goals_on_track },
        ].map(({ label, value }) => (
          <Card key={label}>
            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-surface-500">{label}</p>
              {isLoading ? (
                <div className="mt-2 h-7 w-12 animate-pulse rounded bg-surface-100" />
              ) : (
                <p className="mt-1 text-2xl font-semibold text-surface-900">{value ?? 0}</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Score Distribution */}
        <Card>
          <div className="p-4">
            <p className="mb-4 text-sm font-semibold text-surface-800">Score Distribution</p>
            {isLoading ? (
              <div className="h-48 animate-pulse rounded bg-surface-100" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreDistribution} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <XAxis dataKey="band" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((item, i) => (
                      <Cell key={i} fill={BAND_COLORS[item.band] ?? '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top Performers */}
        <Card>
          <div className="p-4">
            <p className="mb-3 text-sm font-semibold text-surface-800">Top Performers</p>
            {isLoading ? (
              <div className="h-48 animate-pulse rounded bg-surface-100" />
            ) : topPerformers.length === 0 ? (
              <p className="py-8 text-center text-sm text-surface-400">No data available.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Employee</th>
                    <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((tp, i) => (
                    <tr key={tp.employee_id} className="border-b border-surface-50">
                      <td className="py-2 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                          {i + 1}
                        </span>
                        {tp.employee?.full_name ?? tp.employee_id}
                      </td>
                      <td className="py-2 text-right font-semibold text-surface-900">
                        {parseFloat(tp.overall_score).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

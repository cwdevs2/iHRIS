import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { usePerformanceReport } from '@/hooks/useReports';

export function ReportPerformance() {
  const { data, isLoading } = usePerformanceReport();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-surface-900">Performance Distribution</h2>
        <p className="text-sm text-surface-500">Score distribution and top performers across active cycles.</p>
      </div>

      {isLoading && <p className="text-sm text-surface-500">Loading…</p>}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer>
                  <BarChart data={data.score_distribution} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="score_bucket" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#1E40AF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                {data.top_performers.length === 0 ? (
                  <p className="text-sm text-surface-500">No scored reviews yet.</p>
                ) : (
                  data.top_performers.map((row, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-surface-500">#{i + 1}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-surface-900">{row.employee_name || '—'}</span>
                          <span className="font-mono text-xs text-surface-500">{row.employee_number}</span>
                        </div>
                      </div>
                      <span className="font-mono text-base font-semibold text-cta-600">{row.overall_score.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useRecruitmentReport } from '@/hooks/useReports';

const STAGE_COLORS: Record<string, string> = {
  new: '#3B82F6',
  screening: '#A855F7',
  interview: '#F59E0B',
  evaluation: '#EAB308',
  offer: '#10B981',
  hired: '#059669',
  rejected: '#EF4444',
};

export function ReportRecruitment() {
  const { data, isLoading } = useRecruitmentReport();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-surface-900">Recruitment Funnel</h2>
        <p className="text-sm text-surface-500">Pipeline stages, source effectiveness, and time-to-hire.</p>
      </div>

      {isLoading && <p className="text-sm text-surface-500">Loading…</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Tile label="Open postings" value={data.open_postings} />
            <Tile label="Total hired" value={data.hired_count} />
            <Tile label="Avg time-to-hire" value={`${data.avg_time_to_hire_days}d`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={data.by_stage} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="stage" stroke="#64748B" fontSize={12} />
                      <YAxis stroke="#64748B" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {data.by_stage.map((row, i) => (
                          <Cell key={i} fill={STAGE_COLORS[row.stage] ?? '#3B82F6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {data.by_source.length === 0 ? (
                    <p className="text-sm text-surface-500">No applicants in range.</p>
                  ) : (
                    data.by_source.map((row) => (
                      <div key={row.source} className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2">
                        <span className="text-sm text-surface-700">{row.source}</span>
                        <span className="font-mono text-sm font-semibold text-surface-900">{row.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-surface-200 bg-surface-0 p-4">
      <p className="text-xs uppercase tracking-wide text-surface-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-surface-900">{value}</p>
    </div>
  );
}

import { Card } from '@/components/ui/Card';
import { useRecruitmentAnalytics } from '@/hooks/useRecruitment';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const STAGE_COLORS: string[] = [
  '#0369A1', '#1D4ED8', '#7C3AED', '#B45309', '#059669', '#10B981', '#EF4444',
];

export function RecruitmentAnalyticsTab() {
  const { data, isLoading } = useRecruitmentAnalytics();

  const pipelineData = data
    ? Object.entries(data.pipeline_by_stage).map(([stage, count]) => ({ stage, count }))
    : [];

  const sourceData = data?.by_source ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open Postings', value: data?.open_postings },
          { label: 'Total Applicants', value: data?.total_applicants },
          { label: 'Hired This Month', value: data?.hired_this_month },
        ].map(({ label, value }) => (
          <Card key={label}>
            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-surface-500">{label}</p>
              {isLoading ? (
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-surface-100" />
              ) : (
                <p className="mt-1 text-3xl font-semibold text-surface-900">{value ?? 0}</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="p-4">
            <p className="mb-4 text-sm font-semibold text-surface-800">Pipeline by Stage</p>
            {isLoading ? (
              <div className="h-48 animate-pulse rounded bg-surface-100" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {pipelineData.map((_, i) => (
                      <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <p className="mb-4 text-sm font-semibold text-surface-800">By Source</p>
            {isLoading ? (
              <div className="h-48 animate-pulse rounded bg-surface-100" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0369A1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Postings */}
      {(data?.recent_postings?.length ?? 0) > 0 && (
        <Card>
          <div className="p-4">
            <p className="mb-3 text-sm font-semibold text-surface-800">Recent Postings</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  {['Title', 'Type', 'Applicants', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-surface-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data!.recent_postings.map((p) => (
                  <tr key={p.id} className="border-b border-surface-50">
                    <td className="py-2 text-surface-900">{p.title}</td>
                    <td className="py-2 text-surface-600 capitalize">{p.employment_type.replace('_', ' ')}</td>
                    <td className="py-2 text-surface-600">{p.applicants_count ?? 0}</td>
                    <td className="py-2 capitalize text-surface-600">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

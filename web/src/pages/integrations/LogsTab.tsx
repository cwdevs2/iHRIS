import { useState } from 'react';
import dayjs from 'dayjs';
import { Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useIntegrationLogs } from '@/hooks/useIntegrations';

export function LogsTab() {
  const [integration, setIntegration] = useState('');
  const [direction, setDirection] = useState<'inbound' | 'outbound' | ''>('');
  const { data, isLoading } = useIntegrationLogs({
    integration: integration || undefined,
    direction: direction || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-semibold text-surface-900">Integration Activity</h2>
        <div className="flex items-end gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-surface-600">Integration</span>
            <Input
              value={integration}
              onChange={(e) => setIntegration(e.target.value)}
              placeholder="biometric, accounting…"
              className="w-48"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-surface-600">Direction</span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'inbound' | 'outbound' | '')}
              className="h-11 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm focus:border-brand-600 focus:outline-none"
            >
              <option value="">Any</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </label>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto px-0 pb-0">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-200 bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Integration</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source IP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-500">Loading…</td></tr>
              ) : (data?.logs.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                  <Activity className="mx-auto h-8 w-8 text-surface-300" />
                  <p className="mt-2">No integration activity logged.</p>
                </td></tr>
              ) : (
                data?.logs.map((log) => (
                  <tr key={log.id} className="border-b border-surface-100 last:border-0">
                    <td className="px-4 py-3 text-xs text-surface-600">
                      {dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 font-medium text-surface-900">{log.integration}</td>
                    <td className="px-4 py-3">
                      <Badge variant={log.direction === 'inbound' ? 'info' : 'brand'}>{log.direction}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-700">{log.endpoint ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={(log.status_code ?? 500) < 400 ? 'success' : 'danger'}>
                        {log.status_code ?? 'pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-500">{log.source_ip ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

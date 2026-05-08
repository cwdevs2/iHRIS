import { useState } from 'react';
import { CheckCircle2, FileText, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import {
  useAcknowledgePolicy,
  useCreatePolicy,
  usePolicies,
  usePolicyCoverage,
  usePublishPolicy,
} from '@/hooks/useCompliance';
import { useAuthStore } from '@/stores/auth';
import type { CompliancePolicy } from '@/types';

export function PoliciesTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: policies, isLoading } = usePolicies();
  const coverage = usePolicyCoverage();
  const acknowledge = useAcknowledgePolicy();
  const publish = usePublishPolicy();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-surface-900">Policy Library</h2>
        {hasPermission('compliance.policies.manage') && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New policy
          </Button>
        )}
      </div>

      {/* Coverage tiles */}
      {coverage.data && coverage.data.coverage.length > 0 && (
        <Card>
          <CardContent className="px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-surface-500">Acknowledgement coverage</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {coverage.data.coverage.map((row) => (
                <div key={row.policy_id} className="rounded-xl border border-surface-200 p-3">
                  <p className="line-clamp-1 text-sm font-medium text-surface-900">{row.title}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-surface-500">
                    <span>{row.acknowledged} acknowledged · {row.outstanding} outstanding</span>
                    <span className="font-mono font-semibold text-cta-700">{row.coverage_pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-surface-100">
                    <div className="h-full rounded-full bg-cta-500" style={{ width: `${Math.min(100, row.coverage_pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto px-0 pb-0">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-200 bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500">
              <tr>
                <th className="px-4 py-3">Policy</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Effective</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-500">Loading…</td></tr>
              ) : (policies?.policies.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                  <FileText className="mx-auto h-8 w-8 text-surface-300" />
                  <p className="mt-2">No policies yet.</p>
                </td></tr>
              ) : (
                policies?.policies.map((p) => (
                  <PolicyRow
                    key={p.id}
                    policy={p}
                    onPublish={() => publish.mutate(p.id)}
                    onAcknowledge={() => acknowledge.mutate(p.id)}
                    canManage={hasPermission('compliance.policies.manage')}
                    canAcknowledge={hasPermission('compliance.policies.acknowledge')}
                  />
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {createOpen && <CreatePolicyDialog onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

interface RowProps {
  policy: CompliancePolicy;
  onPublish: () => void;
  onAcknowledge: () => void;
  canManage: boolean;
  canAcknowledge: boolean;
}

function PolicyRow({ policy, onPublish, onAcknowledge, canManage, canAcknowledge }: RowProps) {
  const variant: Parameters<typeof Badge>[0]['variant'] =
    policy.status === 'published' ? 'success' : policy.status === 'archived' ? 'default' : 'warning';

  return (
    <tr className="border-b border-surface-100 last:border-0 hover:bg-surface-50/60">
      <td className="px-4 py-3 font-medium text-surface-900">{policy.title}</td>
      <td className="px-4 py-3 text-surface-700">{policy.category}</td>
      <td className="px-4 py-3 font-mono text-xs">v{policy.version}</td>
      <td className="px-4 py-3">
        <Badge variant={variant}>{policy.status}</Badge>
      </td>
      <td className="px-4 py-3 text-surface-700">{policy.effective_on ?? '—'}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {policy.status === 'draft' && canManage && (
            <Button size="sm" variant="outline" onClick={onPublish}>Publish</Button>
          )}
          {policy.status === 'published' && policy.requires_acknowledgment && canAcknowledge && (
            <Button size="sm" variant="ghost" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={onAcknowledge}>
              I acknowledge
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CreatePolicyDialog({ onClose }: { onClose: () => void }) {
  const create = useCreatePolicy();
  const [form, setForm] = useState({
    title: '',
    category: 'general',
    body: '',
    effective_on: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      title: form.title.trim(),
      category: form.category.trim(),
      body: form.body.trim(),
      effective_on: form.effective_on || undefined,
      requires_acknowledgment: true,
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="New Policy" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Category *" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="general / data_privacy / labor" />
          <Input label="Effective on" type="date" value={form.effective_on} onChange={(e) => setForm({ ...form, effective_on: e.target.value })} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-surface-700">Body (markdown)</span>
          <textarea
            required
            rows={8}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="rounded-lg border border-surface-200 bg-surface-0 px-3 py-2 text-sm text-surface-900 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15 focus:outline-none"
          />
        </label>
        <div className="mt-2 flex items-center justify-end gap-2 border-t border-surface-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create draft</Button>
        </div>
      </form>
    </Dialog>
  );
}

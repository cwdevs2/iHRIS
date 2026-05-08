import { useState } from 'react';
import { CheckCircle2, Clock, Plus, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useCreateFiling, useFilings, useMarkFiled } from '@/hooks/useCompliance';
import { useAuthStore } from '@/stores/auth';
import type { FilingStatus } from '@/types';

const STATUS_VARIANTS: Record<FilingStatus, Parameters<typeof Badge>[0]['variant']> = {
  pending: 'warning',
  in_progress: 'info',
  filed: 'success',
  overdue: 'danger',
  cancelled: 'default',
};

export function FilingsTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useFilings();
  const markFiled = useMarkFiled();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-surface-900">Regulatory Filings</h2>
        {hasPermission('compliance.filings.manage') && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New filing reminder
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="overflow-x-auto px-0 pb-0">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-200 bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500">
              <tr>
                <th className="px-4 py-3">Agency</th>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-500">Loading…</td></tr>
              ) : (data?.filings.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                  <ShieldAlert className="mx-auto h-8 w-8 text-surface-300" />
                  <p className="mt-2">No filing reminders yet.</p>
                </td></tr>
              ) : (
                data?.filings.map((f) => (
                  <tr key={f.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50/60">
                    <td className="px-4 py-3 font-medium text-surface-900">{f.agency}</td>
                    <td className="px-4 py-3 font-mono text-xs">{f.form_code}</td>
                    <td className="px-4 py-3 text-surface-700">{f.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-surface-700">
                        <Clock className="h-3.5 w-3.5 text-surface-400" />
                        <span>{f.due_on ?? '—'}</span>
                        {f.days_until_due !== null && f.status !== 'filed' && (
                          <span className={f.days_until_due < 0 ? 'text-red-600' : 'text-surface-500'}>
                            ({f.days_until_due < 0 ? `${Math.abs(f.days_until_due)}d overdue` : `in ${f.days_until_due}d`})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={STATUS_VARIANTS[f.status]}>{f.status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {f.status !== 'filed' && hasPermission('compliance.filings.manage') && (
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          onClick={() => markFiled.mutate({ id: f.id })}
                        >
                          Mark filed
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {createOpen && <CreateFilingDialog onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

function CreateFilingDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateFiling();
  const [form, setForm] = useState({
    agency: 'BIR',
    form_code: '',
    title: '',
    due_on: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      agency: form.agency.trim(),
      form_code: form.form_code.trim(),
      title: form.title.trim(),
      due_on: form.due_on,
      notes: form.notes || undefined,
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="New Filing Reminder" maxWidth="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Agency *" required value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} placeholder="SSS, PhilHealth, BIR…" />
          <Input label="Form code *" required value={form.form_code} onChange={(e) => setForm({ ...form, form_code: e.target.value })} placeholder="1601-C, R-3, RF-1…" />
          <Input label="Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="sm:col-span-2" />
          <Input label="Due on *" required type="date" value={form.due_on} onChange={(e) => setForm({ ...form, due_on: e.target.value })} />
        </div>
        <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="mt-2 flex items-center justify-end gap-2 border-t border-surface-100 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create</Button>
        </div>
      </form>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  useCycles,
  useCreateCycle,
  useActivateCycle,
  useCloseCycle,
  useInitiateReviews,
} from '@/hooks/usePerformance';
import { useAuthStore } from '@/stores/auth';
import type { CycleFilters, CycleStatus, CycleType, CreateCyclePayload } from '@/types';

const STATUS_VARIANT: Record<CycleStatus, 'default' | 'success' | 'brand' | 'warning'> = {
  draft: 'default',
  active: 'success',
  completed: 'brand',
  archived: 'default',
};

interface Props {
  externalOpenCreate?: boolean;
  onCreateClose?: () => void;
}

interface CriterionRow {
  name: string;
  weight: number;
  max_score: number;
}

export function CyclesTab({ externalOpenCreate, onCreateClose }: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [filters] = useState<CycleFilters>({ per_page: 25 });
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (externalOpenCreate) setCreateOpen(true);
  }, [externalOpenCreate]);

  const closeDialog = () => {
    setCreateOpen(false);
    onCreateClose?.();
  };

  const { data, isLoading } = useCycles(filters);
  const createCycle = useCreateCycle();

  const cycles = data?.cycles ?? [];

  const [form, setForm] = useState<Partial<CreateCyclePayload>>({
    type: 'annual',
    enable_self_assessment: true,
    enable_peer_review: false,
    peer_nomination_limit: 3,
  });
  const [criteria, setCriteria] = useState<CriterionRow[]>([
    { name: 'Quality of Work', weight: 30, max_score: 5 },
    { name: 'Attendance & Punctuality', weight: 20, max_score: 5 },
    { name: 'Teamwork', weight: 25, max_score: 5 },
    { name: 'Initiative', weight: 25, max_score: 5 },
  ]);

  const handleCreate = () => {
    if (!form.name || !form.period_start || !form.period_end) return;
    createCycle.mutate(
      { ...form, criteria } as CreateCyclePayload,
      { onSuccess: closeDialog },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {hasPermission('performance.reviews.manage') && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New Cycle
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                {['Name', 'Type', 'Period', 'Status', 'Reviews', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-surface-50">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 w-3/4 animate-pulse rounded bg-surface-100" /></td>
                      ))}
                    </tr>
                  ))
                : cycles.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-surface-400">No cycles found.</td></tr>
                  ) : cycles.map((c) => (
                    <tr key={c.id} className="border-b border-surface-50 hover:bg-surface-50">
                      <td className="px-4 py-3 font-medium text-surface-900">{c.name}</td>
                      <td className="px-4 py-3 text-surface-600 capitalize">{c.type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-surface-500">
                        {dayjs(c.period_start).format('MMM D, YYYY')} – {dayjs(c.period_end).format('MMM D, YYYY')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[c.status]} className="capitalize">{c.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-surface-600">{c.reviews_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {hasPermission('performance.reviews.manage') && (
                            <>
                              {c.status === 'draft' && <ActivateButton id={c.id} />}
                              {c.status === 'active' && (
                                <>
                                  <InitiateButton id={c.id} />
                                  <CloseButton id={c.id} />
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={closeDialog} title="New Review Cycle">
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="field-label">Cycle Name *</label>
            <input
              type="text"
              className="input-field h-10 w-full"
              placeholder="e.g. 2025 Annual Review"
              value={form.name ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Type</label>
              <select
                className="input-field h-10 w-full"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as CycleType }))}
              >
                {(['quarterly', 'semi_annual', 'annual', 'probationary', 'custom'] as CycleType[]).map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enable_self_assessment ?? true}
                  onChange={(e) => setForm((p) => ({ ...p, enable_self_assessment: e.target.checked }))}
                />
                Self Assessment
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enable_peer_review ?? false}
                  onChange={(e) => setForm((p) => ({ ...p, enable_peer_review: e.target.checked }))}
                />
                Peer Review
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Period Start *</label>
              <input type="date" className="input-field h-10 w-full" value={form.period_start ?? ''} onChange={(e) => setForm((p) => ({ ...p, period_start: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Period End *</label>
              <input type="date" className="input-field h-10 w-full" value={form.period_end ?? ''} onChange={(e) => setForm((p) => ({ ...p, period_end: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="field-label">Instructions</label>
            <textarea rows={2} className="input-field w-full resize-none" value={form.instructions ?? ''} onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))} />
          </div>

          {/* Criteria Builder */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="field-label mb-0">Evaluation Criteria</label>
              <button
                type="button"
                onClick={() => setCriteria((p) => [...p, { name: '', weight: 0, max_score: 5 }])}
                className="text-xs text-brand-600 hover:text-brand-700 cursor-pointer"
              >
                + Add criterion
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Criterion name"
                    className="input-field h-9 flex-1"
                    value={c.name}
                    onChange={(e) => setCriteria((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  />
                  <input
                    type="number"
                    placeholder="Weight%"
                    className="input-field h-9 w-20"
                    value={c.weight}
                    onChange={(e) => setCriteria((p) => p.map((x, j) => j === i ? { ...x, weight: Number(e.target.value) } : x))}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="input-field h-9 w-16"
                    value={c.max_score}
                    onChange={(e) => setCriteria((p) => p.map((x, j) => j === i ? { ...x, max_score: Number(e.target.value) } : x))}
                  />
                  <button
                    type="button"
                    onClick={() => setCriteria((p) => p.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeDialog}>Cancel</Button>
            <Button size="sm" loading={createCycle.isPending} onClick={handleCreate}>
              Create Cycle
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function ActivateButton({ id }: { id: string }) {
  const activate = useActivateCycle(id);
  return (
    <button type="button" disabled={activate.isPending} onClick={() => activate.mutate()} className="text-xs font-medium text-green-600 hover:text-green-700 cursor-pointer">
      Activate
    </button>
  );
}

function InitiateButton({ id }: { id: string }) {
  const initiate = useInitiateReviews(id);
  return (
    <button type="button" disabled={initiate.isPending} onClick={() => initiate.mutate()} className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer">
      Initiate Reviews
    </button>
  );
}

function CloseButton({ id }: { id: string }) {
  const close = useCloseCycle(id);
  return (
    <button type="button" disabled={close.isPending} onClick={() => close.mutate()} className="text-xs font-medium text-amber-600 hover:text-amber-700 cursor-pointer">
      Close
    </button>
  );
}

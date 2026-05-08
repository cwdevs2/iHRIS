import { useState } from 'react';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/usePerformance';
import { useAuthStore } from '@/stores/auth';
import type { GoalFilters, GoalStatus, GoalUnit, CreateGoalPayload } from '@/types';

const STATUS_VARIANT: Record<GoalStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand'> = {
  draft: 'default',
  active: 'info',
  achieved: 'success',
  partially_achieved: 'warning',
  missed: 'danger',
  cancelled: 'default',
};

const GOAL_UNITS: GoalUnit[] = ['percentage', 'number', 'currency', 'boolean', 'text'];

export function GoalsTab() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [filters, setFilters] = useState<GoalFilters>({ per_page: 25 });
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useGoals(filters);
  const createGoal = useCreateGoal();

  const goals = data?.goals ?? [];

  const [form, setForm] = useState<Partial<CreateGoalPayload>>({
    unit: 'number',
    weight: 100,
    status: 'active',
  });

  const handleCreate = () => {
    if (!form.employee_id || !form.title) return;
    createGoal.mutate(form as CreateGoalPayload, { onSuccess: () => setCreateOpen(false) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input-field h-10 w-[160px]"
          value={filters.status ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, status: (e.target.value || undefined) as GoalStatus }))}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="achieved">Achieved</option>
          <option value="missed">Missed</option>
        </select>
        <span className="ml-auto text-sm text-surface-500">
          {data?.pagination ? `${data.pagination.total} goals` : '—'}
        </span>
        {hasPermission('performance.reviews.manage') && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Add Goal
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                {['Employee', 'Title', 'Cycle', 'Unit', 'Target', 'Actual', 'Status', 'Due', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-surface-50">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 w-3/4 animate-pulse rounded bg-surface-100" /></td>
                      ))}
                    </tr>
                  ))
                : goals.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-surface-400">No goals found.</td></tr>
                  ) : goals.map((g) => (
                    <tr key={g.id} className="border-b border-surface-50 hover:bg-surface-50">
                      <td className="px-4 py-3 text-surface-900">{g.employee?.full_name ?? g.employee_id}</td>
                      <td className="px-4 py-3 font-medium text-surface-900">{g.title}</td>
                      <td className="px-4 py-3 text-surface-500">{g.cycle?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-surface-600 capitalize">{g.unit}</td>
                      <td className="px-4 py-3 text-surface-600">{g.target_value ?? '—'}</td>
                      <td className="px-4 py-3">
                        <GoalActualInput goalId={g.id} currentValue={g.actual_value} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[g.status]} className="capitalize">{g.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3 text-surface-500">
                        {g.due_date ? dayjs(g.due_date).format('MMM D, YYYY') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {hasPermission('performance.reviews.manage') && (
                          <DeleteGoalButton id={g.id} />
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Add Goal">
        <div className="flex flex-col gap-4">
          <div>
            <label className="field-label">Employee ID *</label>
            <input
              type="text"
              className="input-field h-10 w-full"
              value={form.employee_id ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, employee_id: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">Title *</label>
            <input
              type="text"
              className="input-field h-10 w-full"
              value={form.title ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Unit</label>
              <select
                className="input-field h-10 w-full"
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value as GoalUnit }))}
              >
                {GOAL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Target Value</label>
              <input
                type="text"
                className="input-field h-10 w-full"
                value={form.target_value ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, target_value: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Weight (%)</label>
              <input
                type="number"
                className="input-field h-10 w-full"
                value={form.weight ?? 100}
                onChange={(e) => setForm((p) => ({ ...p, weight: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="field-label">Due Date</label>
              <input
                type="date"
                className="input-field h-10 w-full"
                value={form.due_date ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea rows={2} className="input-field w-full resize-none" value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" loading={createGoal.isPending} onClick={handleCreate}>Add Goal</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function GoalActualInput({ goalId, currentValue }: { goalId: string; currentValue: string | null }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(currentValue ?? '');
  const update = useUpdateGoal(goalId);

  if (!editing) {
    return (
      <button
        type="button"
        className="text-surface-600 hover:text-brand-700 cursor-pointer text-left"
        onClick={() => setEditing(true)}
      >
        {currentValue ?? <span className="text-surface-300">—</span>}
      </button>
    );
  }

  return (
    <input
      type="text"
      autoFocus
      className="input-field h-8 w-24"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        update.mutate({ actual_value: val });
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          update.mutate({ actual_value: val });
          setEditing(false);
        }
        if (e.key === 'Escape') setEditing(false);
      }}
    />
  );
}

function DeleteGoalButton({ id }: { id: string }) {
  const del = useDeleteGoal(id);
  return (
    <button
      type="button"
      disabled={del.isPending}
      onClick={() => del.mutate()}
      className="text-red-400 hover:text-red-600 cursor-pointer"
    >
      <Plus className="h-4 w-4 rotate-45" />
    </button>
  );
}

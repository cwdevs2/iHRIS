import { useState } from 'react';
import dayjs from 'dayjs';
import { Plus, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  useRequisitions,
  useCreateRequisition,
  useApproveRequisition,
} from '@/hooks/useRecruitment';
import { useAuthStore } from '@/stores/auth';
import type {
  RequisitionFilters,
  RequisitionStatus,
  EmploymentType,
  CreateRequisitionPayload,
} from '@/types';

const STATUS_VARIANT: Record<RequisitionStatus, 'default' | 'warning' | 'success' | 'danger' | 'info' | 'brand'> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'default',
  fulfilled: 'brand',
};

const EMPLOYMENT_TYPES: EmploymentType[] = [
  'regular', 'probationary', 'contractual', 'part_time', 'project_based',
];

interface Props {
  externalOpenCreate?: boolean;
  onCreateClose?: () => void;
}

export function RequisitionsTab({ externalOpenCreate, onCreateClose }: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [filters, setFilters] = useState<RequisitionFilters>({ per_page: 25 });
  const [createOpen, setCreateOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);

  const { data, isLoading } = useRequisitions(filters);
  const createReq = useCreateRequisition();

  const isDialogOpen = createOpen || !!externalOpenCreate;
  const closeDialog = () => {
    setCreateOpen(false);
    onCreateClose?.();
  };

  const requisitions = data?.requisitions ?? [];

  // Form state
  const [form, setForm] = useState<Partial<CreateRequisitionPayload>>({
    employment_type: 'regular',
    headcount: 1,
  });

  const handleCreate = () => {
    if (!form.employment_type || !form.headcount) return;
    createReq.mutate(form as CreateRequisitionPayload, { onSuccess: closeDialog });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search position…"
          className="input-field h-10 w-[220px]"
          value={filters.search ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value || undefined }))}
        />
        <select
          className="input-field h-10 w-[180px]"
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((p) => ({ ...p, status: (e.target.value || undefined) as RequisitionStatus }))
          }
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="fulfilled">Fulfilled</option>
        </select>
        <span className="ml-auto text-sm text-surface-500">
          {data?.pagination ? `${data.pagination.total} requisitions` : '—'}
        </span>
        {hasPermission('recruitment.jobs.create') && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New Requisition
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                {['Position', 'Department', 'Requested By', 'Headcount', 'Type', 'Status', 'Date', ''].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-surface-50">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-3/4 animate-pulse rounded bg-surface-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : requisitions.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-surface-400">
                        No requisitions found.
                      </td>
                    </tr>
                  )
                : requisitions.map((req) => (
                    <tr key={req.id} className="border-b border-surface-50 hover:bg-surface-50">
                      <td className="px-4 py-3 font-medium text-surface-900">
                        {req.position?.title ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-surface-600">{req.department?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-surface-600">{req.requested_by?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-surface-600">{req.headcount}</td>
                      <td className="px-4 py-3 text-surface-600 capitalize">{req.employment_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[req.status]} className="capitalize">
                          {req.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-surface-500">
                        {dayjs(req.created_at).format('MMM D, YYYY')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {req.status === 'pending_approval' &&
                            hasPermission('recruitment.jobs.approve') && (
                              <>
                                <ApproveButton id={req.id} action="approve" />
                                <ApproveButton id={req.id} action="reject" />
                              </>
                            )}
                          <Link
                            to="#"
                            className="text-brand-600 hover:text-brand-700 flex items-center gap-0.5 text-xs"
                          >
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onClose={closeDialog} title="New Job Requisition">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Employment Type</label>
              <select
                className="input-field h-10 w-full"
                value={form.employment_type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, employment_type: e.target.value as EmploymentType }))
                }
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Headcount</label>
              <input
                type="number"
                min={1}
                className="input-field h-10 w-full"
                value={form.headcount ?? 1}
                onChange={(e) => setForm((p) => ({ ...p, headcount: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Justification</label>
            <textarea
              rows={3}
              className="input-field w-full resize-none"
              value={form.justification ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, justification: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Min Salary</label>
              <input
                type="number"
                className="input-field h-10 w-full"
                value={form.salary_min ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, salary_min: Number(e.target.value) || undefined }))}
              />
            </div>
            <div>
              <label className="field-label">Max Salary</label>
              <input
                type="number"
                className="input-field h-10 w-full"
                value={form.salary_max ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, salary_max: Number(e.target.value) || undefined }))}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Submit as</label>
            <select
              className="input-field h-10 w-full"
              value={form.status ?? 'draft'}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value as 'draft' | 'pending_approval' }))
              }
            >
              <option value="draft">Save as Draft</option>
              <option value="pending_approval">Submit for Approval</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={createReq.isPending}
              onClick={handleCreate}
            >
              Create Requisition
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function ApproveButton({ id, action }: { id: string; action: 'approve' | 'reject' }) {
  const approve = useApproveRequisition(id);
  return (
    <button
      type="button"
      onClick={() => approve.mutate(action)}
      disabled={approve.isPending}
      className={`text-xs font-medium cursor-pointer ${action === 'approve' ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
    >
      {action === 'approve' ? 'Approve' : 'Reject'}
    </button>
  );
}

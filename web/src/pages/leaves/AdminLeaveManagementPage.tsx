import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck2,
  Tag,
  CreditCard,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import {
  useAdminLeaveRequests,
  useApproveLeave,
  useRejectLeave,
  useAdminLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useEmployeeLeaveBalances,
  useAdjustLeaveBalance,
} from '@/hooks/useAdminLeave';
import type { AdminLeaveRequest, CreateLeaveTypeInput } from '@/api/adminLeave';
import type { LeaveType } from '@/types/ess';
import { useEmployees } from '@/hooks/useEmployees';

/* ─── types ─────────────────────────────────────────────────── */
type Tab = 'requests' | 'types' | 'credits';

/* ─── helpers ────────────────────────────────────────────────── */
function empDisplayName(r: AdminLeaveRequest) {
  if (!r.employee) return 'Unknown';
  const u = r.employee.user;
  return u ? `${u.first_name} ${u.last_name}`.trim() : 'Unknown';
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'default',
};

/* ─── schemas ────────────────────────────────────────────────── */
const leaveTypeSchema = z.object({
  code: z.string().min(1, 'Code required').max(20),
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  default_credits: z.coerce.number().min(0),
  requires_attachment: z.boolean().optional(),
  is_paid: z.boolean().optional(),
});
type LeaveTypeForm = z.infer<typeof leaveTypeSchema>;

const balanceSchema = z.object({
  employee_id: z.string().min(1, 'Employee required'),
  credits: z.coerce.number(),
  reason: z.string().optional(),
});
type BalanceForm = z.infer<typeof balanceSchema>;

/* ─── page ────────────────────────────────────────────────────── */
export function AdminLeaveManagementPage() {
  const [tab, setTab] = useState<Tab>('requests');

  const tabs: { key: Tab; label: string; icon: typeof FileCheck2 }[] = [
    { key: 'requests', label: 'Leave Requests', icon: FileCheck2 },
    { key: 'types', label: 'Leave Types', icon: Tag },
    { key: 'credits', label: 'Leave Credits', icon: CreditCard },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Leave Management</h1>
        <p className="text-sm text-surface-500">Approve requests, manage leave types, and adjust employee credits</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-surface-200 bg-surface-50/60 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
              tab === key
                ? 'bg-surface-0 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200'
                : 'text-surface-500 hover:text-surface-700',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: easeOutStrong }}
        >
          {tab === 'requests' && <RequestsTab />}
          {tab === 'types' && <LeaveTypesTab />}
          {tab === 'credits' && <LeaveCreditsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── Requests Tab ────────────────────────────────────────────── */
function RequestsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const { data, isLoading } = useAdminLeaveRequests({
    per_page: 100,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  });
  const requests = data?.requests ?? [];

  const filtered = search
    ? requests.filter((r) => empDisplayName(r).toLowerCase().includes(search.toLowerCase()))
    : requests;

  const approve = useApproveLeave();
  const reject = useRejectLeave();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="search"
            placeholder="Search employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-surface-200 bg-surface-0 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="ml-auto text-xs text-surface-500">
          <span className="font-medium text-surface-900 tabular-nums">{filtered.length}</span> requests
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/60">
                {['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Status', 'Filed', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-surface-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-surface-500">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-surface-500">No requests found.</td></tr>
              ) : (
                filtered.map((r) => {
                  const name = empDisplayName(r);
                  const isPending = r.status === 'pending';
                  return (
                    <tr key={r.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50 transition-colors duration-200">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                            {initials(name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-surface-900">{name}</p>
                            <p className="text-xs text-surface-500">{r.employee?.position?.name ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-700">{r.leave_type?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-surface-700">
                        {dayjs(r.start_date).format('MMM D')}
                        {r.start_date !== r.end_date ? ` — ${dayjs(r.end_date).format('MMM D')}` : ''}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums font-semibold text-surface-900">{r.days_requested}d</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate text-sm text-surface-600">{r.reason}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[r.status] ?? 'default'}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-500 tabular-nums">{dayjs(r.created_at).format('MMM D')}</td>
                      <td className="px-4 py-3">
                        {isPending && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => approve.mutate({ id: r.id })}
                              disabled={approve.isPending}
                              className="flex items-center gap-1 rounded-md bg-cta-500/10 px-2 py-1 text-xs font-medium text-cta-700 transition-colors hover:bg-cta-500/20 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => reject.mutate({ id: r.id, note: 'Rejected by admin' })}
                              disabled={reject.isPending}
                              className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ─── Leave Types Tab ─────────────────────────────────────────── */
function LeaveTypesTab() {
  const { data, isLoading } = useAdminLeaveTypes();
  const types = data?.types ?? [];
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const createType = useCreateLeaveType();
  const updateType = useUpdateLeaveType();

  const form = useForm<LeaveTypeForm>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: { default_credits: 15, is_paid: true, requires_attachment: false },
  });

  const editForm = useForm<LeaveTypeForm>({
    resolver: zodResolver(leaveTypeSchema),
  });

  const onCreateSubmit = (values: LeaveTypeForm) => {
    createType.mutate(values as CreateLeaveTypeInput, {
      onSuccess: () => {
        setShowCreate(false);
        form.reset({ default_credits: 15, is_paid: true, requires_attachment: false });
      },
    });
  };

  const onEditSubmit = (values: LeaveTypeForm) => {
    if (!editing) return;
    updateType.mutate({ id: editing.id, data: values }, {
      onSuccess: () => setEditing(null),
    });
  };

  const openEdit = (type: LeaveType) => {
    setEditing(type);
    editForm.reset({
      code: type.code,
      name: type.name,
      description: type.description ?? '',
      default_credits: type.default_credits,
      requires_attachment: type.requires_attachment,
      is_paid: type.is_paid,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-surface-500">
          <span className="font-medium text-surface-900 tabular-nums">{types.length}</span> leave types
        </span>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreate(true)}
        >
          New type
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: easeOutStrong }}
          >
            <Card className="border-brand-200 bg-brand-50/30">
              <CardContent className="p-6">
                <h3 className="mb-4 text-sm font-semibold text-surface-900">Create Leave Type</h3>
                <form onSubmit={form.handleSubmit(onCreateSubmit)} className="grid grid-cols-2 gap-4">
                  <LeaveTypeFormFields form={form} />
                  <div className="col-span-2 flex items-center justify-end gap-3 border-t border-surface-100 pt-4">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button type="submit" variant="primary" size="sm" disabled={createType.isPending}>
                      {createType.isPending ? 'Creating…' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Types list */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-16 text-center text-sm text-surface-500">Loading…</div>
        ) : types.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-surface-500">No leave types configured.</div>
        ) : (
          <ul className="divide-y divide-surface-100">
            {types.map((type) => (
              <li key={type.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-surface-50 transition-colors duration-200">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-surface-900">{type.name}</p>
                    <Badge variant="default">{type.code}</Badge>
                    {!type.is_active && <Badge variant="danger">Inactive</Badge>}
                    {type.is_paid ? <Badge variant="success">Paid</Badge> : <Badge variant="default">Unpaid</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-surface-500">{type.description ?? 'No description'}</p>
                  <p className="mt-1 text-xs text-surface-600">
                    <span className="font-medium tabular-nums">{type.default_credits}</span> credits/year
                    {type.requires_attachment ? ' · attachment required' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateType.mutate({ id: type.id, data: { is_active: !type.is_active } })}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100"
                  >
                    {type.is_active ? <ToggleRight className="h-4 w-4 text-cta-600" /> : <ToggleLeft className="h-4 w-4" />}
                    {type.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(type)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setEditing(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: easeOutStrong }}
              className="w-full max-w-lg"
            >
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-4 text-base font-semibold text-surface-900">Edit: {editing.name}</h3>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="grid grid-cols-2 gap-4">
                    <LeaveTypeFormFields form={editForm} />
                    <div className="col-span-2 flex items-center justify-end gap-3 border-t border-surface-100 pt-4">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                      <Button type="submit" variant="primary" size="sm" disabled={updateType.isPending}>
                        {updateType.isPending ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LeaveTypeFormFields({ form }: { form: ReturnType<typeof useForm<LeaveTypeForm>> }) {
  const { register, formState: { errors } } = form;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-surface-700">Code *</label>
        <input {...register('code')} placeholder="e.g. VL" className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600" />
        {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-surface-700">Name *</label>
        <input {...register('name')} placeholder="e.g. Vacation Leave" className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600" />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div className="col-span-2 flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-surface-700">Description</label>
        <input {...register('description')} placeholder="Optional" className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-surface-700">Default Credits *</label>
        <input type="number" min={0} step={1} {...register('default_credits')} className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600" />
        {errors.default_credits && <p className="text-xs text-red-600">{errors.default_credits.message}</p>}
      </div>
      <div className="flex flex-col gap-3 pt-1">
        <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
          <input type="checkbox" {...register('is_paid')} className="h-4 w-4 rounded border-surface-300 text-brand-600" />
          Paid leave
        </label>
        <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
          <input type="checkbox" {...register('requires_attachment')} className="h-4 w-4 rounded border-surface-300 text-brand-600" />
          Requires attachment
        </label>
      </div>
    </>
  );
}

/* ─── Leave Credits Tab ───────────────────────────────────────── */
function LeaveCreditsTab() {
  const { data: empData } = useEmployees();
  const employees = empData?.employees ?? [];
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const { data: balanceData, isLoading } = useEmployeeLeaveBalances(selectedEmpId);
  const balances = balanceData?.balances ?? [];
  const adjustBalance = useAdjustLeaveBalance();

  const adjForm = useForm<BalanceForm>({
    resolver: zodResolver(balanceSchema),
    defaultValues: { employee_id: '' },
  });

  const handleAdjust = (balanceId: string) => {
    setAdjustingId(balanceId);
    adjForm.reset({ employee_id: selectedEmpId, credits: 0, reason: '' });
  };

  const onAdjustSubmit = (values: BalanceForm) => {
    if (!adjustingId) return;
    adjustBalance.mutate(
      { id: adjustingId, credits: values.credits, reason: values.reason },
      { onSuccess: () => setAdjustingId(null) },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedEmpId}
          onChange={(e) => setSelectedEmpId(e.target.value)}
          className="h-10 min-w-[280px] rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          <option value="">Select an employee to view credits…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.user?.first_name} {e.user?.last_name}
              {e.position?.name ? ` — ${e.position.name}` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedEmpId && (
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="px-6 py-16 text-center text-sm text-surface-500">Loading balances…</div>
          ) : balances.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-surface-500">No leave balances found for this employee.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60">
                  {['Leave Type', 'Year', 'Total Credits', 'Used', 'Available', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-surface-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => {
                  return (
                    <tr key={b.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50 transition-colors duration-200">
                      <td className="px-4 py-3 text-sm font-medium text-surface-900">{b.leave_type?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-surface-700">{b.year}</td>
                      <td className="px-4 py-3 text-sm tabular-nums font-semibold text-surface-900">{b.credits}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-surface-700">{b.used}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-sm tabular-nums font-semibold',
                          (b.available ?? 0) <= 0 ? 'text-red-600' : 'text-cta-700',
                        )}>
                          {b.available}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleAdjust(b.id)}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Adjust modal */}
      <AnimatePresence>
        {adjustingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setAdjustingId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: easeOutStrong }}
              className="w-full max-w-md"
            >
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-4 text-base font-semibold text-surface-900">Adjust Leave Credits</h3>
                  <form onSubmit={adjForm.handleSubmit(onAdjustSubmit)} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-surface-700">New Total Credits *</label>
                      <input
                        type="number"
                        step="0.5"
                        {...adjForm.register('credits')}
                        className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-surface-700">Reason</label>
                      <input
                        {...adjForm.register('reason')}
                        placeholder="e.g. Manual accrual, correction…"
                        className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3 border-t border-surface-100 pt-4">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAdjustingId(null)}>Cancel</Button>
                      <Button type="submit" variant="primary" size="sm" disabled={adjustBalance.isPending}>
                        {adjustBalance.isPending ? 'Saving…' : 'Apply Adjustment'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

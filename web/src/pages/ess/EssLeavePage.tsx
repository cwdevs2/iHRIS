import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Plus,
  X,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import {
  useMyLeaveBalances,
  useMyLeaveRequests,
  useLeaveTypes,
  useFileLeave,
  useCancelLeave,
} from '@/hooks/useEss';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import type { LeaveStatus, LeaveBalance, LeaveRequest } from '@/types';

/* ──────────────────────────────────────────────────────────────────
   Schema
   ────────────────────────────────────────────────────────────────── */
const schema = z.object({
  leave_type_id: z.string().min(1, 'Select a leave type'),
  start_date:    z.string().min(1, 'Required'),
  end_date:      z.string().min(1, 'Required'),
  total_days:    z.coerce.number().min(0.5).max(365),
  reason:        z.string().min(5, 'Provide a brief reason').max(1000),
}).refine((d) => d.end_date >= d.start_date, { message: 'End date must be on or after start date', path: ['end_date'] });

type FormValues = z.infer<typeof schema>;

/* ──────────────────────────────────────────────────────────────────
   Status helpers
   ────────────────────────────────────────────────────────────────── */
const STATUS_META: Record<LeaveStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger'; icon: typeof Clock }> = {
  pending:   { label: 'Pending',   variant: 'warning', icon: Clock },
  approved:  { label: 'Approved',  variant: 'success', icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  variant: 'danger',  icon: XCircle },
  cancelled: { label: 'Cancelled', variant: 'default', icon: X },
};

/* ──────────────────────────────────────────────────────────────────
   Leave balance card
   ────────────────────────────────────────────────────────────────── */
function BalanceRow({ balance }: { balance: LeaveBalance }) {
  const pct = balance.credits > 0 ? Math.min(100, (balance.available / balance.credits) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-surface-800">{balance.leave_type.name}</span>
        <span className="text-xs tabular-nums text-surface-500">
          <strong className="text-surface-900">{balance.available}</strong> / {balance.credits} days available
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, ease: easeOutStrong }}
          className={cn('h-full rounded-full', pct < 25 ? 'bg-danger' : pct < 60 ? 'bg-amber-400' : 'bg-cta-500')}
        />
      </div>
      {balance.pending > 0 && (
        <p className="text-xs text-amber-600">{balance.pending} day{balance.pending !== 1 ? 's' : ''} pending approval</p>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Leave request row
   ────────────────────────────────────────────────────────────────── */
function RequestRow({ req, onCancel }: { req: LeaveRequest; onCancel: (id: string) => void }) {
  const meta = STATUS_META[req.status];
  const StatusIcon = meta.icon;

  return (
    <tr className="hover:bg-surface-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-surface-900">
        {req.leave_type?.name ?? '—'}
      </td>
      <td className="px-4 py-3 text-sm text-surface-600 tabular-nums">
        {dayjs(req.start_date).format('MMM D')} – {dayjs(req.end_date).format('MMM D, YYYY')}
      </td>
      <td className="px-4 py-3 text-sm text-center tabular-nums text-surface-700">
        {req.total_days}
      </td>
      <td className="px-4 py-3">
        <Badge variant={meta.variant}>
          <StatusIcon className="h-3 w-3" />
          {meta.label}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        {req.status === 'pending' && (
          <button
            type="button"
            onClick={() => onCancel(req.id)}
            className="text-xs text-danger hover:text-red-700 cursor-pointer transition-colors"
          >
            Cancel
          </button>
        )}
      </td>
    </tr>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */
export function EssLeavePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: balancesData, isLoading: balancesLoading } = useMyLeaveBalances();
  const { data: requestsData, isLoading: requestsLoading } = useMyLeaveRequests();
  const { data: typesData } = useLeaveTypes();
  const fileLeave   = useFileLeave();
  const cancelLeave = useCancelLeave();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { total_days: 1 },
  });

  function onSubmit(values: FormValues) {
    fileLeave.mutate(values, {
      onSuccess: () => {
        setDialogOpen(false);
        reset();
      },
    });
  }

  function handleCancel(id: string) {
    cancelLeave.mutate(id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      {/* Back */}
      <Link to="/ess" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-900 transition-colors duration-150 cursor-pointer w-fit">
        <ChevronLeft className="h-4 w-4" />
        ESS Portal
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">My Leaves</h1>
          <p className="mt-0.5 text-sm text-surface-500">View your leave balances and file new requests.</p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setDialogOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          File Leave
        </Button>
      </div>

      {/* Leave balances */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5">
          <h2 className="text-sm font-semibold text-surface-900">Leave Balances — {dayjs().year()}</h2>
          {balancesLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-surface-400" />
              <span className="text-sm text-surface-400">Loading balances…</span>
            </div>
          ) : (balancesData?.balances?.length ?? 0) === 0 ? (
            <p className="text-sm text-surface-400">No leave balances configured for your account.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {balancesData!.balances.filter((b) => b.credits > 0).map((b) => (
                <BalanceRow key={b.leave_type.id} balance={b} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave request history */}
      <Card>
        <div className="border-b border-surface-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-surface-900">My Leave Requests</h2>
        </div>
        {requestsLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
          </div>
        ) : (requestsData?.requests?.length ?? 0) === 0 ? (
          <div className="grid place-items-center py-12">
            <div className="flex flex-col items-center gap-2">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-100 text-surface-400">
                <CalendarDays className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-surface-700">No leave requests yet</p>
              <p className="text-xs text-surface-400">Click "File Leave" to submit your first request.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Dates</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-surface-500">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {requestsData!.requests.map((req) => (
                  <RequestRow key={req.id} req={req} onCancel={handleCancel} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* File leave dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); reset(); }} title="File Leave Request" maxWidth="md">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-6">
          {/* Leave type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-surface-700">Leave Type <span className="text-danger">*</span></label>
            <select
              {...register('leave_type_id')}
              className={cn(
                'h-10 w-full rounded-lg border bg-surface-0 px-3 text-sm text-surface-900',
                'focus:outline-none focus:ring-2 focus:ring-brand-600',
                errors.leave_type_id ? 'border-danger' : 'border-surface-200',
              )}
            >
              <option value="">Select leave type…</option>
              {typesData?.types?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {errors.leave_type_id && <p className="text-xs text-danger">{errors.leave_type_id.message}</p>}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Start Date <span className="text-danger">*</span></label>
              <Input type="date" {...register('start_date')} error={errors.start_date?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">End Date <span className="text-danger">*</span></label>
              <Input type="date" {...register('end_date')} error={errors.end_date?.message} />
            </div>
          </div>

          {/* Total days */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-surface-700">Total Days <span className="text-danger">*</span></label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              {...register('total_days')}
              placeholder="1"
              error={errors.total_days?.message}
            />
            <p className="text-xs text-surface-400">Use 0.5 for a half-day leave.</p>
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-surface-700">Reason <span className="text-danger">*</span></label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="Brief description of your leave reason…"
              className={cn(
                'w-full resize-none rounded-lg border bg-surface-0 px-3 py-2 text-sm text-surface-900',
                'placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600',
                errors.reason ? 'border-danger' : 'border-surface-200',
              )}
            />
            {errors.reason && <p className="text-xs text-danger">{errors.reason.message}</p>}
          </div>

          {/* Note about attachments */}
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-700">Sick leave requires a medical certificate attachment. Please bring or email it to HR after filing.</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setDialogOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={fileLeave.isPending}>
              Submit Request
            </Button>
          </div>
        </form>
      </Dialog>
    </motion.div>
  );
}

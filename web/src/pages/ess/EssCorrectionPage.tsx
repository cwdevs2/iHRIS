import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileEdit,
  ChevronLeft,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useMyCorrections, useFileCorrection } from '@/hooks/useEss';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import type { CorrectionStatus, AttendanceCorrectionRequest } from '@/types';

/* ──────────────────────────────────────────────────────────────────
   Schema
   ────────────────────────────────────────────────────────────────── */
const schema = z.object({
  work_date:           z.string().min(1, 'Required'),
  requested_clock_in:  z.string().optional(),
  requested_clock_out: z.string().optional(),
  reason:              z.string().min(5, 'Please describe the issue').max(500),
});

type FormValues = z.infer<typeof schema>;

/* ──────────────────────────────────────────────────────────────────
   Status helpers
   ────────────────────────────────────────────────────────────────── */
const STATUS_META: Record<CorrectionStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger'; icon: typeof Clock }> = {
  pending:  { label: 'Pending',  variant: 'warning', icon: Clock },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rejected', variant: 'danger',  icon: XCircle },
};

function CorrectionRow({ req }: { req: AttendanceCorrectionRequest }) {
  const meta = STATUS_META[req.status];
  const StatusIcon = meta.icon;

  return (
    <tr className="hover:bg-surface-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-surface-900 tabular-nums">
        {dayjs(req.work_date).format('MMM D, YYYY')}
      </td>
      <td className="px-4 py-3 text-sm text-surface-600 tabular-nums">
        {req.requested_clock_in ?? '—'} → {req.requested_clock_out ?? '—'}
      </td>
      <td className="px-4 py-3 text-sm text-surface-600 max-w-xs truncate">
        {req.reason}
      </td>
      <td className="px-4 py-3">
        <Badge variant={meta.variant}>
          <StatusIcon className="h-3 w-3" />
          {meta.label}
        </Badge>
      </td>
      <td className="px-4 py-3 text-xs text-surface-400 tabular-nums whitespace-nowrap">
        {dayjs(req.created_at).format('MMM D, h:mm A')}
      </td>
    </tr>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */
export function EssCorrectionPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useMyCorrections();
  const fileCorrection = useFileCorrection();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function onSubmit(values: FormValues) {
    fileCorrection.mutate(
      {
        work_date:           values.work_date,
        requested_clock_in:  values.requested_clock_in || undefined,
        requested_clock_out: values.requested_clock_out || undefined,
        reason:              values.reason,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          reset();
        },
      },
    );
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
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Attendance Corrections</h1>
          <p className="mt-0.5 text-sm text-surface-500">Request corrections for missing or incorrect time entries.</p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setDialogOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          New Request
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <AlertCircle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" aria-hidden />
        <p className="text-sm text-blue-800">
          Correction requests are reviewed by HR. Approved corrections will update your attendance record and hours worked.
        </p>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
          </div>
        ) : (data?.corrections?.length ?? 0) === 0 ? (
          <div className="grid place-items-center py-16">
            <div className="flex flex-col items-center gap-2">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-100 text-surface-400">
                <FileEdit className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-surface-700">No correction requests</p>
              <p className="text-xs text-surface-400">Submit a request if your clock-in or clock-out was missed or incorrect.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Work Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Requested Times</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Filed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {data!.corrections.map((req) => (
                  <CorrectionRow key={req.id} req={req} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); reset(); }} title="Attendance Correction Request" maxWidth="md">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-6">
          {/* Work date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-surface-700">Work Date <span className="text-danger">*</span></label>
            <Input type="date" {...register('work_date')} error={errors.work_date?.message} />
          </div>

          {/* Requested times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Clock In (corrected)</label>
              <Input type="time" {...register('requested_clock_in')} />
              <p className="text-xs text-surface-400">Leave blank if not applicable</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Clock Out (corrected)</label>
              <Input type="time" {...register('requested_clock_out')} />
              <p className="text-xs text-surface-400">Leave blank if not applicable</p>
            </div>
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-surface-700">Reason <span className="text-danger">*</span></label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="e.g. Forgot to clock out — I left the office at 18:30…"
              className={cn(
                'w-full resize-none rounded-lg border bg-surface-0 px-3 py-2 text-sm',
                'placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600',
                errors.reason ? 'border-danger' : 'border-surface-200',
              )}
            />
            {errors.reason && <p className="text-xs text-danger">{errors.reason.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setDialogOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={fileCorrection.isPending}>
              Submit
            </Button>
          </div>
        </form>
      </Dialog>
    </motion.div>
  );
}

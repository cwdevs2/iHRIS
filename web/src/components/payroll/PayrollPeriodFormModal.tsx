import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { useCreatePayrollPeriod, useUpdatePayrollPeriod } from '@/hooks/usePayroll';
import type { PayrollPeriod } from '@/types';

interface FormValues {
  name: string;
  frequency: 'monthly' | 'semi_monthly' | 'weekly' | 'bi_weekly';
  period_start: string;
  period_end: string;
  pay_date?: string | null;
  working_days?: number | null;
  status?: 'open' | 'processing' | 'closed';
  remarks?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  period?: PayrollPeriod | null;
}

export function PayrollPeriodFormModal({ open, onClose, period }: Props) {
  const isEdit = !!period;
  const create = useCreatePayrollPeriod();
  const update = useUpdatePayrollPeriod(period?.id ?? '');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      name: period?.name ?? '',
      frequency: period?.frequency ?? 'semi_monthly',
      period_start: period?.period_start ?? '',
      period_end: period?.period_end ?? '',
      pay_date: period?.pay_date ?? '',
      working_days: period?.working_days ?? null,
      status: period?.status ?? 'open',
      remarks: period?.remarks ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: period?.name ?? '',
        frequency: period?.frequency ?? 'semi_monthly',
        period_start: period?.period_start ?? '',
        period_end: period?.period_end ?? '',
        pay_date: period?.pay_date ?? '',
        working_days: period?.working_days ?? null,
        status: period?.status ?? 'open',
        remarks: period?.remarks ?? '',
      });
    }
  }, [open, period, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      working_days: values.working_days ? Number(values.working_days) : null,
      pay_date: values.pay_date || null,
      remarks: values.remarks || null,
    };
    if (isEdit) await update.mutateAsync(payload);
    else await create.mutateAsync(payload);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-xl rounded-2xl bg-surface-0 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-surface-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-surface-900">
              {isEdit ? 'Edit payroll period' : 'New payroll period'}
            </h3>
            <p className="mt-0.5 text-xs text-surface-500">Define a pay window for which payroll runs will be generated.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Name</label>
            <input
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g. May 1–15, 2026"
              className="input-field mt-1.5"
            />
            {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Frequency</label>
              <select {...register('frequency')} className="input-field mt-1.5">
                <option value="semi_monthly">Semi-monthly</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="bi_weekly">Bi-weekly</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Status</label>
              <select {...register('status')} className="input-field mt-1.5">
                <option value="open">Open</option>
                <option value="processing">Processing</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Period start</label>
              <input type="date" {...register('period_start', { required: 'Start date required' })} className="input-field mt-1.5" />
              {errors.period_start ? <p className="mt-1 text-xs text-red-600">{errors.period_start.message}</p> : null}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Period end</label>
              <input type="date" {...register('period_end', { required: 'End date required' })} className="input-field mt-1.5" />
              {errors.period_end ? <p className="mt-1 text-xs text-red-600">{errors.period_end.message}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Pay date</label>
              <input type="date" {...register('pay_date')} className="input-field mt-1.5" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Working days</label>
              <input type="number" step="0.5" {...register('working_days')} className="input-field mt-1.5" placeholder="e.g. 11" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Remarks</label>
            <textarea {...register('remarks')} rows={2} className="input-field mt-1.5" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create period'}</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

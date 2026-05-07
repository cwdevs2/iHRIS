import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import dayjs from 'dayjs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLoans, useCreateLoan } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuthStore } from '@/stores/auth';
import { formatPeso } from '@/lib/money';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';

const TYPE_LABEL: Record<string, string> = {
  sss: 'SSS Salary Loan',
  pagibig: 'Pag-IBIG Loan',
  company: 'Company Loan',
  salary_advance: 'Salary Advance',
  other: 'Other',
};

interface FormValues {
  employee_id: string;
  type: 'sss' | 'pagibig' | 'company' | 'salary_advance' | 'other';
  reference_number?: string;
  principal: number;
  terms_months: number;
  monthly_amortization?: number;
  start_date: string;
  end_date: string;
  notes?: string;
}

export function LoansTab() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('payroll.loans.manage');

  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useLoans({ per_page: 50 });
  const { data: empData } = useEmployees({ per_page: 200 });
  const createLoan = useCreateLoan();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { type: 'company', terms_months: 12 },
  });

  const loans = data?.loans ?? [];
  const employees = empData?.employees ?? [];

  const onSubmit = async (values: FormValues) => {
    await createLoan.mutateAsync({
      ...values,
      principal: Number(values.principal),
      terms_months: Number(values.terms_months),
      monthly_amortization: values.monthly_amortization ? Number(values.monthly_amortization) : null,
      reference_number: values.reference_number || null,
      notes: values.notes || null,
    });
    reset({ type: 'company', terms_months: 12 } as FormValues);
    setCreateOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-500">
          {data?.pagination ? `${data.pagination.total} loans` : 'Loading…'}
        </p>
        {canManage ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New loan
          </Button>
        ) : null}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Principal</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Monthly</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-surface-500">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Term</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-3/4 animate-pulse rounded bg-surface-100" /></td>
                    ))}
                  </tr>
                ))
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                        <Wallet className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-surface-900">No active loans</p>
                    </div>
                  </td>
                </tr>
              ) : (
                loans.map((l) => (
                  <tr key={l.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-surface-900">{l.employee?.full_name}</p>
                      <p className="text-xs text-surface-500">{l.employee?.employee_number}</p>
                    </td>
                    <td className="px-4 py-3 text-surface-700">{TYPE_LABEL[l.type]}</td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(l.principal)}</td>
                    <td className="px-4 py-3 text-right text-surface-700 tabular-nums">{formatPeso(l.monthly_amortization)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-surface-900 tabular-nums">{formatPeso(l.outstanding_balance)}</td>
                    <td className="px-4 py-3 text-surface-700 text-xs">
                      {l.start_date ? dayjs(l.start_date).format('MMM YYYY') : '—'} → {l.end_date ? dayjs(l.end_date).format('MMM YYYY') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={l.status === 'active' ? 'info' : l.status === 'paid' ? 'success' : 'warning'}>
                        {l.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-xl rounded-2xl bg-surface-0 p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-surface-900">New loan</h3>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Employee</label>
                <select {...register('employee_id', { required: 'Required' })} className="input-field mt-1.5">
                  <option value="">Select employee…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name} ({e.employee_number})</option>
                  ))}
                </select>
                {errors.employee_id ? <p className="mt-1 text-xs text-red-600">{errors.employee_id.message}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Type</label>
                  <select {...register('type')} className="input-field mt-1.5">
                    {Object.entries(TYPE_LABEL).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Reference number</label>
                  <input {...register('reference_number')} className="input-field mt-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Principal</label>
                  <input type="number" step="0.01" {...register('principal', { required: 'Required', min: 0.01 })} className="input-field mt-1.5" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Terms (months)</label>
                  <input type="number" {...register('terms_months', { required: 'Required', min: 1 })} className="input-field mt-1.5" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Monthly amort.</label>
                  <input type="number" step="0.01" {...register('monthly_amortization')} className="input-field mt-1.5" placeholder="auto" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Start date</label>
                  <input type="date" {...register('start_date', { required: 'Required' })} className="input-field mt-1.5" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">End date</label>
                  <input type="date" {...register('end_date', { required: 'Required' })} className="input-field mt-1.5" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-surface-500">Notes</label>
                <textarea rows={2} {...register('notes')} className="input-field mt-1.5" />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" loading={isSubmitting}>Create loan</Button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

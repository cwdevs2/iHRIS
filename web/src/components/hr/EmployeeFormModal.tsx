import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { useDepartments, usePositions } from '@/hooks/useOrganization';
import { ApiError } from '@/lib/api';
import type { Employee } from '@/types';
import { easeOutStrong } from '@/lib/motion';

const schema = z.object({
  // Identity
  first_name: z.string().min(1, 'First name is required').max(100),
  middle_name: z.string().max(100).optional().or(z.literal('')),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().max(50).optional().or(z.literal('')),
  // Employment
  employment_status: z.enum(['regular', 'probationary', 'contractual', 'part_time', 'project_based', 'resigned', 'terminated', 'on_leave']),
  department_id: z.string().uuid().nullable().optional(),
  position_id: z.string().uuid().nullable().optional(),
  date_hired: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().optional(),
  civil_status: z.enum(['single', 'married', 'widowed', 'separated', 'divorced']).nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
  address_line_1: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
  basic_salary: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().min(0).nullable().optional(),
  ),
  pay_frequency: z.enum(['monthly', 'semi_monthly', 'weekly', 'daily']).nullable().optional(),
  // Work schedule
  shift_type: z.enum(['day', 'evening', 'night', 'custom']).nullable().optional(),
  shift_start: z.string().nullable().optional(),
  shift_end: z.string().nullable().optional(),
  work_days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  employee?: Employee | null;
}

const EMPLOYMENT_STATUSES = [
  { value: 'regular', label: 'Regular' },
  { value: 'probationary', label: 'Probationary' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'project_based', label: 'Project-based' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
] as const;

export function EmployeeFormModal({ open, onClose, employee }: Props) {
  const isEditing = !!employee;
  const create = useCreateEmployee();
  const update = useUpdateEmployee(employee?.id ?? '');
  const { data: deptData } = useDepartments({ all: true });
  const { data: posData } = usePositions({ all: true });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      phone: '',
      employment_status: 'probationary',
      department_id: null,
      position_id: null,
      nationality: 'Filipino',
      pay_frequency: 'semi_monthly',
    },
  });

  const selectedDeptId = watch('department_id');

  // Filter positions by selected department
  const filteredPositions = posData?.positions?.filter(
    (p) => !selectedDeptId || p.department_id === selectedDeptId,
  ) ?? [];

  // Populate form when editing
  useEffect(() => {
    if (employee) {
      reset({
        first_name: employee.first_name ?? '',
        middle_name: employee.middle_name ?? '',
        last_name: employee.last_name ?? '',
        email: employee.email ?? '',
        phone: employee.phone ?? '',
        employment_status: employee.employment_status,
        department_id: employee.department_id,
        position_id: employee.position_id,
        date_hired: employee.date_hired ?? undefined,
        birth_date: employee.birth_date ?? undefined,
        gender: employee.gender ?? undefined,
        civil_status: employee.civil_status ?? undefined,
        nationality: employee.nationality ?? 'Filipino',
        address_line_1: employee.address_line_1 ?? undefined,
        city: employee.city ?? undefined,
        province: employee.province ?? undefined,
        basic_salary: employee.basic_salary ? Number(employee.basic_salary) : undefined,
        pay_frequency: employee.pay_frequency ?? 'semi_monthly',
        shift_type: employee.shift_type ?? undefined,
        shift_start: employee.shift_start ?? undefined,
        shift_end: employee.shift_end ?? undefined,
        work_days: employee.work_days ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
      });
    } else {
      reset({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        phone: '',
        employment_status: 'probationary',
        nationality: 'Filipino',
        pay_frequency: 'semi_monthly',
        shift_type: 'day',
        shift_start: '08:00',
        shift_end: '17:00',
        work_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      });
    }
  }, [employee, reset, open]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        department_id: values.department_id || null,
        position_id: values.position_id || null,
      };

      if (isEditing) {
        await update.mutateAsync(payload);
      } else {
        await create.mutateAsync({ ...payload, employment_status: values.employment_status });
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        Object.entries(err.fields).forEach(([field, messages]) => {
          setError(field as keyof FormValues, { message: messages[0] });
        });
      }
    }
  });

  const isPending = create.isPending || update.isPending;

  return (
    <AnimatePresence>
      {open ? (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Sheet */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.25, ease: easeOutStrong }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-surface-0 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={isEditing ? 'Edit employee' : 'Add employee'}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-surface-900">
                  {isEditing ? 'Edit Employee' : 'Add Employee'}
                </h2>
                <p className="text-xs text-surface-500">
                  {isEditing ? `Editing ${employee.full_name ?? employee.employee_number}` : 'Create a new employee record'}
                </p>
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

            {/* Scrollable body */}
            <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

                {/* Identity */}
                <fieldset className="flex flex-col gap-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-1">
                    Identity
                  </legend>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First name *"
                      placeholder="Juan"
                      error={errors.first_name?.message}
                      {...register('first_name')}
                    />
                    <Input
                      label="Last name *"
                      placeholder="Dela Cruz"
                      error={errors.last_name?.message}
                      {...register('last_name')}
                    />
                  </div>

                  <Input
                    label="Middle name"
                    placeholder="Santos"
                    error={errors.middle_name?.message}
                    {...register('middle_name')}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Email *"
                      type="email"
                      placeholder="juan@company.com"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                    <Input
                      label="Phone"
                      type="tel"
                      placeholder="+63 917 000 0000"
                      error={errors.phone?.message}
                      {...register('phone')}
                    />
                  </div>
                </fieldset>

                {/* Employment */}
                <fieldset className="flex flex-col gap-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-1">
                    Employment
                  </legend>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-surface-700">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('employment_status')}
                      className="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
                    >
                      {EMPLOYMENT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    {errors.employment_status ? (
                      <p className="text-xs text-red-500">{errors.employment_status.message}</p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-surface-700">Department</label>
                      <select
                        {...register('department_id')}
                        className="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
                      >
                        <option value="">— None —</option>
                        {deptData?.departments?.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-surface-700">Position</label>
                      <select
                        {...register('position_id')}
                        className="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
                      >
                        <option value="">— None —</option>
                        {filteredPositions.map((p) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Date hired"
                      type="date"
                      error={errors.date_hired?.message}
                      {...register('date_hired')}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-surface-700">Pay frequency</label>
                      <select
                        {...register('pay_frequency')}
                        className="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
                      >
                        <option value="semi_monthly">Semi-monthly</option>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="daily">Daily</option>
                      </select>
                    </div>
                  </div>

                  <Input
                    label="Basic salary (₱)"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    error={errors.basic_salary?.message}
                    {...register('basic_salary')}
                  />
                </fieldset>

                {/* Personal */}
                <fieldset className="flex flex-col gap-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-1">
                    Personal
                  </legend>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Birth date"
                      type="date"
                      error={errors.birth_date?.message}
                      {...register('birth_date')}
                    />

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-surface-700">Gender</label>
                      <select
                        {...register('gender')}
                        className="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
                      >
                        <option value="">— Not specified —</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-surface-700">Civil status</label>
                      <select
                        {...register('civil_status')}
                        className="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
                      >
                        <option value="">— Not specified —</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="widowed">Widowed</option>
                        <option value="separated">Separated</option>
                        <option value="divorced">Divorced</option>
                      </select>
                    </div>

                    <Input
                      label="Nationality"
                      placeholder="Filipino"
                      error={errors.nationality?.message}
                      {...register('nationality')}
                    />
                  </div>
                </fieldset>

                {/* Address */}
                <fieldset className="flex flex-col gap-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-1">
                    Address
                  </legend>
                  <Input
                    label="Address line 1"
                    placeholder="Street, Barangay"
                    error={errors.address_line_1?.message}
                    {...register('address_line_1')}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="City / Municipality" {...register('city')} />
                    <Input label="Province" {...register('province')} />
                  </div>
                </fieldset>

                {/* Work Schedule */}
                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-surface-700 uppercase tracking-wide">Work Schedule</legend>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-surface-700">Shift Type</label>
                      <select
                        {...register('shift_type')}
                        className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">— Select —</option>
                        <option value="day">Day Shift</option>
                        <option value="evening">Evening Shift</option>
                        <option value="night">Night Shift</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <Input label="Shift Start" type="time" {...register('shift_start')} />
                    <Input label="Shift End" type="time" {...register('shift_end')} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-surface-700">Work Days</label>
                    <div className="flex flex-wrap gap-3">
                      {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => (
                        <label key={day} className="flex items-center gap-1.5 text-sm capitalize cursor-pointer">
                          <input
                            type="checkbox"
                            value={day}
                            {...register('work_days')}
                            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                          />
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                </fieldset>
              </div>

              {/* Footer */}
              <div className="border-t border-surface-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isPending}
                  disabled={isEditing && !isDirty}
                >
                  {isEditing ? 'Save changes' : 'Add employee'}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

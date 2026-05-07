import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { ApiError } from '@/lib/api';
import { easeOutStrong } from '@/lib/motion';
import type { SystemUser } from '@/types';

const baseSchema = z.object({
  first_name:  z.string().min(1, 'Required').max(100),
  last_name:   z.string().min(1, 'Required').max(100),
  middle_name: z.string().max(100).optional().nullable(),
  email:       z.string().email('Invalid email'),
  phone:       z.string().max(30).optional().nullable(),
  status:      z.enum(['active', 'inactive', 'suspended']),
  role_ids:    z.array(z.string().uuid()).optional(),
});

const createSchema = baseSchema.extend({
  password: z.string().min(8, 'Min 8 characters'),
});

const editSchema = baseSchema.extend({
  password: z.string().min(8, 'Min 8 characters').optional().or(z.literal('')),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;
type FormValues = CreateForm | EditForm;

interface Props {
  open: boolean;
  onClose: () => void;
  user?: SystemUser | null;
}

export function UserFormModal({ open, onClose, user }: Props) {
  const isEditing = !!user;
  const [showPassword, setShowPassword] = useState(false);

  const create = useCreateUser();
  const update = useUpdateUser(user?.id ?? '');
  const { data: roles = [] } = useRoles();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(isEditing ? editSchema : createSchema) as never,
    defaultValues: {
      first_name:  '',
      last_name:   '',
      middle_name: '',
      email:       '',
      phone:       '',
      status:      'active',
      password:    '',
      role_ids:    [],
    },
  });

  const selectedRoleIds = (watch('role_ids') as string[]) ?? [];

  useEffect(() => {
    if (user) {
      reset({
        first_name:  user.first_name,
        last_name:   user.last_name,
        middle_name: user.middle_name ?? '',
        email:       user.email,
        phone:       user.phone ?? '',
        status:      user.status,
        password:    '',
        role_ids:    user.roles.map((r) => r.id),
      });
    } else {
      reset({
        first_name: '', last_name: '', middle_name: '', email: '',
        phone: '', status: 'active', password: '', role_ids: [],
      });
    }
  }, [user, reset, open]);

  const toggleRole = (id: string) => {
    const current = selectedRoleIds;
    setValue(
      'role_ids',
      current.includes(id) ? current.filter((r) => r !== id) : [...current, id],
      { shouldDirty: true },
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        const payload = { ...values };
        if (!payload.password) delete (payload as Record<string, unknown>).password;
        await update.mutateAsync(payload as never);
      } else {
        await create.mutateAsync(values as CreateForm);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        Object.entries(err.fields).forEach(([field, msgs]) =>
          setError(field as keyof FormValues, { message: msgs[0] }),
        );
      }
    }
  });

  const isPending = create.isPending || update.isPending;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="sheet"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.25, ease: easeOutStrong }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface-0 shadow-2xl"
            role="dialog"
            aria-modal
          >
            <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-surface-900">
                  {isEditing ? 'Edit User' : 'Create User'}
                </h2>
                <p className="text-xs text-surface-500">
                  {isEditing ? user.email : 'Set up a new system account'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
                {/* Name */}
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
                  placeholder="Optional"
                  {...register('middle_name')}
                />

                {/* Contact */}
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
                  placeholder="+63 900 000 0000"
                  {...register('phone')}
                />

                {/* Password */}
                <Input
                  label={isEditing ? 'New password (leave blank to keep)' : 'Password *'}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isEditing ? '••••••••' : 'Min 8 characters'}
                  error={(errors as Record<string, {message?: string}>).password?.message}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="grid h-full w-full cursor-pointer place-items-center text-surface-400 hover:text-surface-700"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  {...register('password')}
                />

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-surface-700">Status</label>
                  <select
                    {...register('status')}
                    className="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* Roles */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-surface-700">Roles</p>
                  <div className="flex flex-col gap-1.5 rounded-lg border border-surface-200 p-2">
                    {roles.length === 0 ? (
                      <p className="py-2 text-center text-xs text-surface-400">Loading roles…</p>
                    ) : (
                      roles.map((role) => (
                        <label
                          key={role.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                            checked={selectedRoleIds.includes(role.id)}
                            onChange={() => toggleRole(role.id)}
                          />
                          <div>
                            <p className="text-sm font-medium text-surface-900">{role.display_name}</p>
                            <p className="text-xs text-surface-500">{role.name}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-surface-200 px-6 py-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
                <Button type="submit" loading={isPending} disabled={isEditing && !isDirty}>
                  {isEditing ? 'Save changes' : 'Create user'}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

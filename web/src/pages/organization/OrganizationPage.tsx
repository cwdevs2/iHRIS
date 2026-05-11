import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Building2, Briefcase, Pencil, Trash2, X, ChevronDown, ChevronRight, Users, UserPlus, UserMinus, Shield } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
  usePositions, useCreatePosition, useUpdatePosition, useDeletePosition,
} from '@/hooks/useOrganization';
import {
  useUserGroups, useUserGroup,
  useCreateUserGroup, useUpdateUserGroup, useDeleteUserGroup,
  useAddGroupMember, useRemoveGroupMember,
} from '@/hooks/useUserGroups';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/lib/api';
import { easeOutStrong } from '@/lib/motion';
import type { Department, Position, UserGroup, UserGroupType } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutStrong } },
};

// ─── Department Form ──────────────────────────────────────────────────────────

const deptSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
});
type DeptForm = z.infer<typeof deptSchema>;

function DepartmentFormModal({
  open, onClose, department,
}: { open: boolean; onClose: () => void; department?: Department | null }) {
  const isEditing = !!department;
  const create = useCreateDepartment();
  const update = useUpdateDepartment(department?.id ?? '');
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<DeptForm>({
    resolver: zodResolver(deptSchema),
    defaultValues: { code: department?.code ?? '', name: department?.name ?? '', description: department?.description ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) await update.mutateAsync(values);
      else await create.mutateAsync(values);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => setError(f as keyof DeptForm, { message: msgs[0] }));
      }
    }
  });

  if (!open) return null;
  const isPending = create.isPending || update.isPending;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: easeOutStrong }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-surface-0 shadow-2xl" role="dialog" aria-modal>
          <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4">
            <h2 className="text-base font-semibold text-surface-900">{isEditing ? 'Edit Department' : 'New Department'}</h2>
            <button type="button" onClick={onClose} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-6 py-5">
            <div className="grid grid-cols-3 gap-4">
              <Input label="Code *" placeholder="ENG" error={errors.code?.message} {...register('code')} className="uppercase" />
              <div className="col-span-2">
                <Input label="Name *" placeholder="Engineering" error={errors.name?.message} {...register('name')} />
              </div>
            </div>
            <Input label="Description" placeholder="Optional description…" error={errors.description?.message} {...register('description')} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
              <Button type="submit" loading={isPending} disabled={isEditing && !isDirty}>
                {isEditing ? 'Save changes' : 'Create department'}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}

// ─── Position Form ────────────────────────────────────────────────────────────

const posSchema = z.object({
  title: z.string().min(1).max(150),
  department_id: z.string().uuid('Please select a department.').nullable().optional(),
  description: z.string().max(500).optional(),
  min_salary: z.coerce.number().min(0).nullable().optional(),
  max_salary: z.coerce.number().min(0).nullable().optional(),
});
type PosForm = z.infer<typeof posSchema>;

function PositionFormModal({
  open, onClose, position, defaultDeptId,
}: { open: boolean; onClose: () => void; position?: Position | null; defaultDeptId?: string }) {
  const isEditing = !!position;
  const create = useCreatePosition();
  const update = useUpdatePosition(position?.id ?? '');
  const { data: deptData } = useDepartments({ all: true });
  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<PosForm>({
    resolver: zodResolver(posSchema) as Resolver<PosForm>,
    defaultValues: {
      title: position?.title ?? '',
      department_id: position?.department_id ?? defaultDeptId ?? null,
      description: position?.description ?? '',
      min_salary: position?.min_salary ? Number(position.min_salary) : undefined,
      max_salary: position?.max_salary ? Number(position.max_salary) : undefined,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        department_id: values.department_id || null,
        min_salary: values.min_salary ?? null,
        max_salary: values.max_salary ?? null,
      };
      if (isEditing) await update.mutateAsync(payload);
      else await create.mutateAsync(payload);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => setError(f as keyof PosForm, { message: msgs[0] }));
      }
    }
  });

  if (!open) return null;
  const isPending = create.isPending || update.isPending;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: easeOutStrong }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-surface-0 shadow-2xl" role="dialog" aria-modal>
          <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4">
            <h2 className="text-base font-semibold text-surface-900">{isEditing ? 'Edit Position' : 'New Position'}</h2>
            <button type="button" onClick={onClose} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-6 py-5">
            <Input label="Title *" placeholder="Senior Engineer" error={errors.title?.message} {...register('title')} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Department</label>
              <select
                {...register('department_id')}
                className="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
              >
                <option value="">— None —</option>
                {(deptData?.departments as Department[] | undefined)?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.department_id ? <p className="text-xs text-red-500">{errors.department_id.message}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Min salary (₱)" type="number" step="0.01" {...register('min_salary')} />
              <Input label="Max salary (₱)" type="number" step="0.01" {...register('max_salary')} />
            </div>
            <Input label="Description" placeholder="Optional description…" {...register('description')} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
              <Button type="submit" loading={isPending} disabled={isEditing && !isDirty}>
                {isEditing ? 'Save changes' : 'Create position'}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}

// ─── Department Row ───────────────────────────────────────────────────────────

function DepartmentRow({
  department, canEdit, canDelete,
}: { department: Department; canEdit: boolean; canDelete: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [editPos, setEditPos] = useState<Position | null>(null);
  const [deletePos, setDeletePos] = useState<Position | null>(null);
  const [editDept, setEditDept] = useState(false);
  const [deleteDept, setDeleteDept] = useState(false);

  const { data: posData, isLoading: posLoading } = usePositions({ department_id: department.id, all: true });
  const deleteDeptMutation = useDeleteDepartment();
  const deletePosMutation = useDeletePosition();

  const positions = posData?.positions ?? [];

  return (
    <>
      <div className="border-b border-surface-100 last:border-0">
        {/* Department header */}
        <div
          className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          <button type="button" className="text-surface-400" aria-label={expanded ? 'Collapse' : 'Expand'}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <Building2 className="h-4 w-4 shrink-0 text-brand-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-900">{department.name}</p>
            <p className="text-xs text-surface-500">{department.code} · {department.employees_count ?? 0} employees · {positions.length} positions</p>
          </div>
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { setPosModalOpen(true); setEditPos(null); }}
              className="flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-surface-200 px-2 text-xs text-surface-600 hover:bg-surface-100 transition-colors"
            >
              <Plus className="h-3 w-3" /> Position
            </button>
            {canEdit ? (
              <button type="button" onClick={() => setEditDept(true)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors" aria-label="Edit department">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {canDelete ? (
              <button type="button" onClick={() => setDeleteDept(true)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors" aria-label="Delete department">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Positions */}
        <AnimatePresence>
          {expanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: easeOutStrong }}
              className="overflow-hidden"
            >
              {posLoading ? (
                <div className="ml-12 border-l border-surface-100 pl-4 py-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-surface-100" />
                </div>
              ) : positions.length === 0 ? (
                <p className="ml-12 py-3 text-xs text-surface-400">No positions yet.</p>
              ) : (
                <div className="ml-12 border-l border-surface-100">
                  {(positions as Position[]).map((pos) => (
                    <div key={pos.id} className="flex items-center gap-3 pl-4 pr-4 py-2.5 hover:bg-surface-50 border-b border-surface-50 last:border-0 transition-colors group">
                      <Briefcase className="h-3.5 w-3.5 shrink-0 text-surface-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-800">{pos.title}</p>
                        {(pos.min_salary || pos.max_salary) ? (
                          <p className="text-xs text-surface-500">
                            ₱{Number(pos.min_salary ?? 0).toLocaleString()} – ₱{Number(pos.max_salary ?? 0).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs text-surface-400">{pos.employee_count ?? 0} employees</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit ? (
                          <button type="button" onClick={() => { setEditPos(pos); setPosModalOpen(true); }} className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors">
                            <Pencil className="h-3 w-3" />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button type="button" onClick={() => setDeletePos(pos)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Department modals */}
      <AnimatePresence>
        {editDept ? <DepartmentFormModal open onClose={() => setEditDept(false)} department={department} /> : null}
      </AnimatePresence>

      {/* Position modal */}
      <AnimatePresence>
        {posModalOpen ? (
          <PositionFormModal open onClose={() => { setPosModalOpen(false); setEditPos(null); }} position={editPos} defaultDeptId={department.id} />
        ) : null}
      </AnimatePresence>

      {/* Delete position confirm */}
      {deletePos ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeletePos(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-sm rounded-2xl bg-surface-0 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-surface-900">Archive position?</h3>
            <p className="mt-2 text-sm text-surface-600">Archive <strong>{deletePos.title}</strong>? Employees assigned to this position will not be affected.</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeletePos(null)}>Cancel</Button>
              <Button variant="danger" loading={deletePosMutation.isPending} onClick={async () => { await deletePosMutation.mutateAsync(deletePos.id); setDeletePos(null); }}>Archive</Button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {/* Delete department confirm */}
      {deleteDept ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteDept(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-sm rounded-2xl bg-surface-0 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-surface-900">Archive department?</h3>
            <p className="mt-2 text-sm text-surface-600">This will archive <strong>{department.name}</strong>. Departments with active employees cannot be archived.</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteDept(false)}>Cancel</Button>
              <Button variant="danger" loading={deleteDeptMutation.isPending} onClick={async () => { await deleteDeptMutation.mutateAsync(department.id); setDeleteDept(false); }}>Archive</Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </>
  );
}

// ─── Group helpers ────────────────────────────────────────────────────────────

const GROUP_TYPE_LABELS: Record<UserGroupType, string> = {
  department_head: 'Dept Head',
  hr_admin: 'HR Admin',
  custom: 'Custom',
};
const GROUP_TYPE_COLORS: Record<UserGroupType, string> = {
  department_head: 'bg-blue-50 text-blue-700',
  hr_admin: 'bg-purple-50 text-purple-700',
  custom: 'bg-surface-100 text-surface-600',
};

// ─── Group Form Modal ─────────────────────────────────────────────────────────

const groupSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(['department_head', 'hr_admin', 'custom']),
  is_active: z.boolean().default(true),
  department_ids: z.array(z.string()).default([]),
});
type GroupForm = z.infer<typeof groupSchema>;

function GroupFormModal({
  open, onClose, group,
}: { open: boolean; onClose: () => void; group?: UserGroup | null }) {
  const isEditing = !!group;
  const create = useCreateUserGroup();
  const update = useUpdateUserGroup(group?.id ?? '');
  const { data: deptData } = useDepartments({ all: true });

  const { register, handleSubmit, setError, watch, setValue, formState: { errors, isDirty } } = useForm<GroupForm>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: group?.name ?? '',
      description: group?.description ?? '',
      type: group?.type ?? 'department_head',
      is_active: group?.is_active ?? true,
      department_ids: group?.department_ids ?? [],
    },
  });

  const selectedDeptIds = watch('department_ids');

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) await update.mutateAsync(values);
      else await create.mutateAsync(values);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => setError(f as keyof GroupForm, { message: msgs[0] }));
      }
    }
  });

  if (!open) return null;
  const isPending = create.isPending || update.isPending;
  const departments = (deptData?.departments as Department[] | undefined) ?? [];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: easeOutStrong }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-lg rounded-2xl bg-surface-0 shadow-2xl" role="dialog" aria-modal>
          <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4">
            <h2 className="text-base font-semibold text-surface-900">{isEditing ? 'Edit Group' : 'New User Group'}</h2>
            <button type="button" onClick={onClose} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-6 py-5">
            <Input label="Name *" placeholder="Engineering Heads" error={errors.name?.message} {...register('name')} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Type *</label>
              <select
                {...register('type')}
                className="h-11 w-full rounded-lg border border-surface-200 bg-surface-0 px-3.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
              >
                <option value="department_head">Department Head</option>
                <option value="hr_admin">HR Admin</option>
                <option value="custom">Custom</option>
              </select>
              {errors.type ? <p className="text-xs text-red-500">{errors.type.message}</p> : null}
            </div>
            <Input label="Description" placeholder="Optional description…" error={errors.description?.message ?? ''} {...register('description')} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">Departments</label>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-surface-200 bg-surface-0 divide-y divide-surface-100">
                {departments.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-surface-400">No departments available.</p>
                ) : departments.map((d) => {
                  const checked = selectedDeptIds.includes(d.id);
                  return (
                    <label key={d.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-50 transition-colors">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-600/15"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setValue('department_ids', [...selectedDeptIds, d.id], { shouldDirty: true });
                          else setValue('department_ids', selectedDeptIds.filter((x) => x !== d.id), { shouldDirty: true });
                        }}
                      />
                      <span className="text-sm text-surface-900">{d.name}</span>
                      <span className="ml-auto text-xs text-surface-400">{d.code}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" className="h-4 w-4 rounded border-surface-300 text-brand-600" {...register('is_active')} />
              <span className="text-sm font-medium text-surface-700">Active</span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
              <Button type="submit" loading={isPending} disabled={isEditing && !isDirty}>
                {isEditing ? 'Save changes' : 'Create group'}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}

// ─── Group Row ────────────────────────────────────────────────────────────────

function GroupRow({
  group, canEdit, canDelete, canManageMembers,
}: { group: UserGroup; canEdit: boolean; canDelete: boolean; canManageMembers: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const { data: fullGroup, isLoading } = useUserGroup(expanded ? group.id : undefined);
  const deleteGroup = useDeleteUserGroup();
  const removeMember = useRemoveGroupMember(group.id);

  const members = fullGroup?.members ?? [];
  const departments = fullGroup?.departments ?? group.departments ?? [];

  return (
    <>
      <div className="border-b border-surface-100 last:border-0">
        <div
          className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          <button type="button" className="text-surface-400" aria-label={expanded ? 'Collapse' : 'Expand'}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <Shield className="h-4 w-4 shrink-0 text-brand-600" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-surface-900">{group.name}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${GROUP_TYPE_COLORS[group.type]}`}>
                {GROUP_TYPE_LABELS[group.type]}
              </span>
              {!group.is_active ? (
                <span className="inline-flex items-center rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">Inactive</span>
              ) : null}
            </div>
            <p className="text-xs text-surface-500">
              {group.members_count ?? 0} members · {(group.departments?.length ?? group.department_ids?.length ?? 0)} departments
            </p>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {canManageMembers ? (
              <button
                type="button"
                onClick={() => setAddMemberOpen(true)}
                className="flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-surface-200 px-2 text-xs text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <UserPlus className="h-3 w-3" /> Add member
              </button>
            ) : null}
            {canEdit ? (
              <button type="button" onClick={() => setEditOpen(true)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors" aria-label="Edit group">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {canDelete ? (
              <button type="button" onClick={() => setDeleteOpen(true)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors" aria-label="Archive group">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <AnimatePresence>
          {expanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: easeOutStrong }}
              className="overflow-hidden"
            >
              {/* Scoped departments */}
              {departments.length > 0 ? (
                <div className="ml-12 flex flex-wrap gap-1.5 px-4 py-2 border-l border-surface-100">
                  {departments.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700">
                      <Building2 className="h-3 w-3" /> {d.name}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Members list */}
              <div className="ml-12 border-l border-surface-100">
                {isLoading ? (
                  <div className="pl-4 py-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-surface-100" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="pl-4 py-3 text-xs text-surface-400">No members yet.</p>
                ) : members.map((m) => (
                  <div key={m.id} className="group flex items-center gap-3 pl-4 pr-4 py-2.5 hover:bg-surface-50 border-b border-surface-50 last:border-0 transition-colors">
                    <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-surface-200">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-xs font-medium text-surface-600">
                          {m.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-800">{m.full_name}</p>
                      <p className="text-xs text-surface-500">{m.email}</p>
                    </div>
                    {canManageMembers ? (
                      <button
                        type="button"
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-surface-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                        aria-label="Remove member"
                        onClick={() => removeMember.mutate(m.id)}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editOpen ? <GroupFormModal open onClose={() => setEditOpen(false)} group={group} /> : null}
      </AnimatePresence>

      {addMemberOpen ? (
        <AddMemberModal groupId={group.id} onClose={() => setAddMemberOpen(false)} />
      ) : null}

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-sm rounded-2xl bg-surface-0 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-surface-900">Archive group?</h3>
            <p className="mt-2 text-sm text-surface-600">Archive <strong>{group.name}</strong>? Members will not be affected but the group will no longer apply to access control.</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="danger" loading={deleteGroup.isPending} onClick={async () => { await deleteGroup.mutateAsync(group.id); setDeleteOpen(false); }}>Archive</Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddMemberModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [userId, setUserId] = useState('');
  const add = useAddGroupMember(groupId);

  const handleAdd = async () => {
    if (!userId.trim()) return;
    await add.mutateAsync(userId.trim());
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: easeOutStrong }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-surface-0 shadow-2xl" role="dialog" aria-modal>
          <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4">
            <h2 className="text-base font-semibold text-surface-900">Add Member</h2>
            <button type="button" onClick={onClose} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-4 px-6 py-5">
            <Input
              label="User ID (UUID)"
              placeholder="Enter the user's UUID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose} disabled={add.isPending}>Cancel</Button>
              <Button leftIcon={<UserPlus className="h-4 w-4" />} loading={add.isPending} disabled={!userId.trim()} onClick={handleAdd}>Add member</Button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function OrganizationPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('hr.departments.create');
  const canEdit = hasPermission('hr.departments.edit');
  const canDelete = hasPermission('hr.departments.delete');
  const canViewGroups = hasPermission('hr.user_groups.view');
  const canCreateGroup = hasPermission('hr.user_groups.create');
  const canEditGroup = hasPermission('hr.user_groups.edit');
  const canDeleteGroup = hasPermission('hr.user_groups.delete');
  const canManageMembers = hasPermission('hr.user_groups.manage_members');

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  const { data, isLoading } = useDepartments({ search: search || undefined });
  const departments = data?.departments ?? [];

  const { data: groupData, isLoading: groupsLoading } = useUserGroups(
    canViewGroups ? { search: groupSearch || undefined } : undefined
  );
  const groups = (groupData?.groups ?? []) as UserGroup[];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Organization</h1>
          <p className="mt-0.5 text-sm text-surface-500">Departments, positions and access groups</p>
        </div>
        {canCreate ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDeptModalOpen(true)}>
            New department
          </Button>
        ) : null}
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants} className="relative max-w-md">
        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          type="search"
          placeholder="Search departments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-surface-200 bg-surface-0 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
        />
      </motion.div>

      {/* Departments tree */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <div className="flex flex-col gap-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-surface-50">
                  <div className="h-4 w-4 animate-pulse rounded bg-surface-100" />
                  <div className="h-4 w-48 animate-pulse rounded bg-surface-100" />
                </div>
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-surface-900">No departments found</p>
                <p className="mt-0.5 text-xs text-surface-500">
                  {search ? 'Try a different search term.' : 'Create your first department to get started.'}
                </p>
              </div>
              {canCreate && !search ? (
                <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDeptModalOpen(true)}>
                  New department
                </Button>
              ) : null}
            </div>
          ) : (
            (departments as Department[]).map((dept) => (
              <DepartmentRow
                key={dept.id}
                department={dept}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))
          )}
        </Card>
      </motion.div>

      {/* ── User Groups ── */}
      {canViewGroups ? (
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-surface-900">User Groups</h2>
              <p className="text-xs text-surface-500">Scope HR authority to specific departments</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                <input
                  type="search"
                  placeholder="Search groups…"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="h-9 rounded-lg border border-surface-200 bg-surface-0 pl-8 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
                />
              </div>
              {canCreateGroup ? (
                <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setGroupModalOpen(true)}>
                  New group
                </Button>
              ) : null}
            </div>
          </div>
          <Card>
            {groupsLoading ? (
              <div className="flex flex-col gap-0">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-surface-50">
                    <div className="h-4 w-4 animate-pulse rounded bg-surface-100" />
                    <div className="h-4 w-48 animate-pulse rounded bg-surface-100" />
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-surface-900">No user groups found</p>
                  <p className="mt-0.5 text-xs text-surface-500">
                    {groupSearch ? 'Try a different search term.' : 'Create a group to delegate HR access to department heads.'}
                  </p>
                </div>
                {canCreateGroup && !groupSearch ? (
                  <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setGroupModalOpen(true)}>
                    New group
                  </Button>
                ) : null}
              </div>
            ) : groups.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                canEdit={canEditGroup}
                canDelete={canDeleteGroup}
                canManageMembers={canManageMembers}
              />
            ))}
          </Card>
        </motion.div>
      ) : null}

      {/* New department modal */}
      <AnimatePresence>
        {deptModalOpen ? <DepartmentFormModal open onClose={() => setDeptModalOpen(false)} /> : null}
      </AnimatePresence>

      {/* New group modal */}
      <AnimatePresence>
        {groupModalOpen ? <GroupFormModal open onClose={() => setGroupModalOpen(false)} /> : null}
      </AnimatePresence>
    </motion.div>
  );
}

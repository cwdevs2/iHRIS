import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
  ClipboardList,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle2,
  Circle,
  Users,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  useOnboardingChecklists,
  useOnboardingAssignments,
  useCreateChecklist,
  useDeleteChecklist,
  useAssignOnboarding,
  useCompleteTask,
  type OnboardingAssignment,
  type OnboardingChecklist,
} from '@/hooks/useOnboarding';
import { easeOutStrong } from '@/lib/motion';
import dayjs from 'dayjs';

// ─── Checklist builder modal ──────────────────────────────────────────────────

const taskSchema = z.object({
  title:         z.string().min(1, 'Required'),
  description:   z.string().optional(),
  is_required:   z.boolean().default(true),
  assigned_role: z.string().optional(),
  due_days:      z.number().int().min(1).nullable().optional(),
});

const checklistSchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  tasks:       z.array(taskSchema).min(1, 'Add at least one task'),
});
type ChecklistForm = z.infer<typeof checklistSchema>;

function ChecklistModal({ onClose }: { onClose: () => void }) {
  const create = useCreateChecklist();
  const { register, control, handleSubmit, formState: { errors } } = useForm<ChecklistForm>({
    resolver: zodResolver(checklistSchema),
    defaultValues: { tasks: [{ title: '', is_required: true }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'tasks' });

  const onSubmit = handleSubmit(async (values) => {
    await create.mutateAsync(values);
    onClose();
  });

  return (
    <Dialog open onClose={onClose} title="New Onboarding Checklist" maxWidth="xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-700">Checklist name *</label>
            <input {...register('name')} placeholder="e.g. New Employee Standard Checklist" className="input-field" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-700">Description</label>
            <input {...register('description')} className="input-field" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-surface-700 uppercase tracking-wide">Tasks</p>
            <Button type="button" size="sm" variant="ghost" leftIcon={<Plus className="h-3 w-3" />}
              onClick={() => append({ title: '', is_required: true })}>
              Add task
            </Button>
          </div>
          {errors.tasks?.root && <p className="text-xs text-red-500">{errors.tasks.root.message}</p>}

          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-start gap-2 rounded-lg border border-surface-200 bg-surface-50 p-3">
                <GripVertical className="h-4 w-4 mt-2 text-surface-300 shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="col-span-2 flex flex-col gap-1">
                    <input {...register(`tasks.${i}.title`)} placeholder={`Task ${i + 1}`} className="input-field" />
                    {errors.tasks?.[i]?.title && <p className="text-xs text-red-500">{errors.tasks[i].title?.message}</p>}
                  </div>
                  <input {...register(`tasks.${i}.assigned_role`)} placeholder="Assigned role (optional)" className="input-field" />
                  <input
                    {...register(`tasks.${i}.due_days`, { valueAsNumber: true })}
                    type="number"
                    placeholder="Due after (days)"
                    className="input-field"
                    min={1}
                  />
                  <label className="flex items-center gap-2 text-xs text-surface-700 col-span-2">
                    <Controller
                      control={control}
                      name={`tasks.${i}.is_required`}
                      render={({ field: f }) => (
                        <input type="checkbox" checked={f.value} onChange={f.onChange} className="accent-brand-600" />
                      )}
                    />
                    Required task
                  </label>
                </div>
                <button type="button" onClick={() => remove(i)} className="mt-1 text-surface-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={create.isPending} leftIcon={<ClipboardList className="h-4 w-4" />}>
            Create Checklist
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Assign modal ─────────────────────────────────────────────────────────────

function AssignModal({ checklists, onClose }: { checklists: OnboardingChecklist[]; onClose: () => void }) {
  const assign = useAssignOnboarding();
  const { register, handleSubmit, formState: { errors } } = useForm<{ employee_id: string; checklist_id: string; start_date?: string }>();

  const onSubmit = handleSubmit(async (values) => {
    await assign.mutateAsync(values);
    onClose();
  });

  return (
    <Dialog open onClose={onClose} title="Assign Onboarding" maxWidth="md">
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-surface-700">Employee ID (UUID) *</label>
          <input {...register('employee_id', { required: 'Required' })} placeholder="Employee UUID" className="input-field" />
          {errors.employee_id && <p className="text-xs text-red-500">{errors.employee_id.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-surface-700">Checklist *</label>
          <select {...register('checklist_id', { required: 'Required' })} className="input-field">
            <option value="">Select checklist…</option>
            {checklists.filter(c => c.is_active).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.checklist_id && <p className="text-xs text-red-500">{errors.checklist_id.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-surface-700">Start date</label>
          <input type="date" {...register('start_date')} className="input-field" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={assign.isPending} leftIcon={<UserPlus className="h-4 w-4" />}>
            Assign
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Assignment card ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  not_started: 'default',
  in_progress: 'warning',
  completed:   'success',
  cancelled:   'default',
};

function AssignmentCard({ assignment }: { assignment: OnboardingAssignment }) {
  const [expanded, setExpanded] = useState(assignment.status === 'in_progress');
  const completeTask = useCompleteTask();

  const tasks         = assignment.checklist?.tasks ?? [];
  const completions   = assignment.task_completions ?? [];
  const completedCount = completions.filter(c => c.completed_at !== null).length;
  const pct           = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const empName = assignment.employee?.user
    ? `${assignment.employee.user.first_name} ${assignment.employee.user.last_name}`
    : assignment.employee?.employee_number ?? assignment.employee_id;

  return (
    <div className="rounded-xl border border-surface-200 bg-surface-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors cursor-pointer text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="text-sm font-semibold text-surface-900">{empName}</p>
            <Badge variant={STATUS_BADGE[assignment.status] ?? 'default'} className="capitalize">
              {assignment.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-xs text-surface-500 mt-0.5">{assignment.checklist?.name}</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 text-xs text-surface-500 min-w-[120px]">
          <div className="flex-1 h-1.5 rounded-full bg-surface-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="tabular-nums w-10 text-right">{pct}%</span>
        </div>

        {expanded ? <ChevronDown className="h-4 w-4 text-surface-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-surface-400 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: easeOutStrong }}
            className="border-t border-surface-100"
          >
            <div className="flex flex-col divide-y divide-surface-50">
              {tasks.map(task => {
                const comp = completions.find(c => c.task_id === task.id);
                const done = comp?.completed_at !== null && comp?.completed_at !== undefined;
                return (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => completeTask.mutate({ assignmentId: assignment.id, taskId: task.id })}
                      className={`shrink-0 transition-colors ${done ? 'text-green-500' : 'text-surface-300 hover:text-brand-500'}`}
                      disabled={completeTask.isPending}
                    >
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </button>
                    <div className="flex-1">
                      <p className={`text-sm ${done ? 'line-through text-surface-400' : 'text-surface-800'}`}>{task.title}</p>
                      {task.description && <p className="text-xs text-surface-400">{task.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {task.assigned_role && <Badge variant="info" className="text-[10px]">{task.assigned_role}</Badge>}
                      {task.due_days && <span className="text-[11px] text-surface-400">Due day {task.due_days}</span>}
                      {!task.is_required && <span className="text-[11px] text-surface-400 italic">optional</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {assignment.start_date && (
              <div className="px-5 py-2.5 text-xs text-surface-400 bg-surface-50 border-t border-surface-100">
                Started {dayjs(assignment.start_date).format('MMMM D, YYYY')}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutStrong } },
};

type View = 'assignments' | 'checklists';

export function OnboardingPage() {
  const [view, setView]           = useState<View>('assignments');
  const [showChecklist, setShowChecklist] = useState(false);
  const [showAssign, setShowAssign]       = useState(false);
  const [deleteChecklistId, setDeleteChecklistId] = useState<string | null>(null);

  const { data: checklistData, isLoading: clLoading } = useOnboardingChecklists();
  const { data: assignData, isLoading: aLoading }     = useOnboardingAssignments();
  const deleteChecklist = useDeleteChecklist();

  const checklists  = checklistData?.checklists ?? [];
  const assignments = assignData?.assignments ?? [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Onboarding</h1>
          <p className="mt-0.5 text-sm text-surface-500">Manage onboarding checklists and track employee progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" leftIcon={<ClipboardList className="h-3.5 w-3.5" />} onClick={() => setShowChecklist(true)}>
            New Checklist
          </Button>
          <Button size="sm" variant="primary" leftIcon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setShowAssign(true)}>
            Assign Onboarding
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex items-center gap-1 border-b border-surface-200">
        {(['assignments', 'checklists'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize cursor-pointer
              ${view === v ? 'border-brand-600 text-brand-700' : 'border-transparent text-surface-500 hover:text-surface-800'}`}
          >
            {v}
          </button>
        ))}
      </motion.div>

      {/* Assignments tab */}
      {view === 'assignments' && (
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          {aLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-100" />
            ))
          ) : !assignments.length ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-surface-900">No onboarding assignments</p>
              <p className="text-xs text-surface-500">Assign a checklist to a new employee to get started.</p>
              <Button size="sm" variant="primary" leftIcon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setShowAssign(true)}>
                Assign Onboarding
              </Button>
            </div>
          ) : (
            assignments.map(a => <AssignmentCard key={a.id} assignment={a} />)
          )}
        </motion.div>
      )}

      {/* Checklists tab */}
      {view === 'checklists' && (
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          {clLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-100" />
            ))
          ) : !checklists.length ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                <ClipboardList className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-surface-900">No checklists yet</p>
              <Button size="sm" variant="primary" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowChecklist(true)}>
                Create first checklist
              </Button>
            </div>
          ) : (
            checklists.map(cl => (
              <Card key={cl.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-surface-900">{cl.name}</p>
                      <Badge variant={cl.is_active ? 'success' : 'default'}>{cl.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    {cl.description && <p className="text-xs text-surface-500 mt-0.5">{cl.description}</p>}
                    <p className="text-xs text-surface-400 mt-1">{cl.tasks?.length ?? 0} tasks</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-400 hover:text-red-600"
                    onClick={() => setDeleteChecklistId(cl.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showChecklist && <ChecklistModal onClose={() => setShowChecklist(false)} />}
        {showAssign && <AssignModal checklists={checklists} onClose={() => setShowAssign(false)} />}
        {deleteChecklistId && (
          <Dialog open onClose={() => setDeleteChecklistId(null)} title="Delete Checklist" maxWidth="sm">
            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <p className="text-sm text-surface-700">This checklist will be permanently deleted. Existing assignments will remain.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDeleteChecklistId(null)}>Cancel</Button>
                <Button variant="danger" loading={deleteChecklist.isPending}
                  onClick={async () => { await deleteChecklist.mutateAsync(deleteChecklistId); setDeleteChecklistId(null); }}
                  leftIcon={<Trash2 className="h-4 w-4" />}>
                  Delete
                </Button>
              </div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

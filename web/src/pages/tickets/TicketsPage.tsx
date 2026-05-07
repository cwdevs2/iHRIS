import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useTickets, useCreateTicket, type TicketStatus, type TicketPriority } from '@/hooks/useTickets';
import { useAuthStore } from '@/stores/auth';
import { easeOutStrong } from '@/lib/motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

// ─── Status & Priority helpers ────────────────────────────────────────────────

const STATUS_BADGE: Record<TicketStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  open:         'info',
  in_progress:  'warning',
  pending_info: 'warning',
  resolved:     'success',
  closed:       'default',
  cancelled:    'danger',
};

const PRIORITY_BADGE: Record<TicketPriority, 'default' | 'warning' | 'danger' | 'info'> = {
  low:    'default',
  normal: 'info',
  high:   'warning',
  urgent: 'danger',
};

const STATUS_ICON: Record<TicketStatus, typeof TicketIcon> = {
  open:         Clock,
  in_progress:  AlertCircle,
  pending_info: Clock,
  resolved:     CheckCircle2,
  closed:       CheckCircle2,
  cancelled:    XCircle,
};

const CATEGORIES = [
  'payroll', 'leave', 'benefits', 'grievance', 'general', 'other',
] as const;

// ─── Create ticket modal ──────────────────────────────────────────────────────

const createSchema = z.object({
  subject:     z.string().min(3, 'Subject is required').max(255),
  category:    z.enum(['payroll', 'leave', 'benefits', 'grievance', 'general', 'other']),
  description: z.string().min(10, 'Please provide more detail'),
  priority:    z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});
type CreateForm = z.infer<typeof createSchema>;

function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const create = useCreateTicket();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { category: 'general', priority: 'normal' },
  });

  const onSubmit = handleSubmit(async (values) => {
    await create.mutateAsync(values);
    onClose();
  });

  return (
    <Dialog open onClose={onClose} title="File HR Ticket" maxWidth="lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-700">Subject *</label>
            <input {...register('subject')} placeholder="Brief description of your issue" className="input-field" />
            {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-700">Category *</label>
            <select {...register('category')} className="input-field">
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-700">Priority</label>
            <select {...register('priority')} className="input-field">
              {(['low', 'normal', 'high', 'urgent'] as const).map(p => (
                <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-700">Description *</label>
            <textarea {...register('description')} rows={5} className="input-field resize-none" placeholder="Describe your issue in detail…" />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={create.isPending} leftIcon={<TicketIcon className="h-4 w-4" />}>
            Submit Ticket
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Ticket row ───────────────────────────────────────────────────────────────

function TicketRow({ ticket }: { ticket: ReturnType<typeof useTickets>['data'] extends { tickets: infer T } ? T[number] : never }) {
  const navigate = useNavigate();
  const StatusIcon = STATUS_ICON[ticket.status];

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: easeOutStrong }}
      className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors cursor-pointer"
      onClick={() => navigate(`/tickets/${ticket.id}`)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <StatusIcon className="h-4 w-4 text-surface-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-surface-900 leading-tight">{ticket.subject}</p>
            <p className="text-[11px] text-surface-400 mt-0.5 font-mono">{ticket.ticket_number}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="info" className="capitalize">{ticket.category}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant={PRIORITY_BADGE[ticket.priority]} className="capitalize">{ticket.priority}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_BADGE[ticket.status]} className="capitalize">{ticket.status.replace('_', ' ')}</Badge>
      </td>
      <td className="px-4 py-3 text-xs text-surface-500">
        {ticket.submitter ? `${ticket.submitter.first_name} ${ticket.submitter.last_name}` : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-surface-400">{dayjs(ticket.created_at).fromNow()}</td>
      <td className="px-4 py-3">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/tickets/${ticket.id}`); }}>
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </td>
    </motion.tr>
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

export function TicketsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState<TicketStatus | ''>('');
  const [priority, setPriority]     = useState<TicketPriority | ''>('');
  const [page, setPage]             = useState(1);
  const hasManage = useAuthStore(s => s.hasPermission('hr.tickets.manage'));

  const { data, isLoading } = useTickets({
    search: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
    page,
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">HR Helpdesk</h1>
          <p className="mt-0.5 text-sm text-surface-500">
            {hasManage ? 'Manage employee ticket requests' : 'Your submitted HR tickets'}
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
          New Ticket
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tickets…"
            className="input-field pl-9"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value as TicketStatus | ''); setPage(1); }} className="input-field w-40">
          <option value="">All statuses</option>
          {(['open', 'in_progress', 'pending_info', 'resolved', 'closed', 'cancelled'] as const).map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => { setPriority(e.target.value as TicketPriority | ''); setPage(1); }} className="input-field w-36">
          <option value="">All priorities</option>
          {(['low', 'normal', 'high', 'urgent'] as const).map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-100" />
            ))}
          </div>
        ) : !data?.tickets?.length ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                <TicketIcon className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-surface-900">No tickets found</p>
              <p className="text-xs text-surface-500">File a ticket to get help from the HR team.</p>
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>
                File first ticket
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50 text-xs font-medium text-surface-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Subject</th>
                  <th className="px-4 py-2.5 text-left">Category</th>
                  <th className="px-4 py-2.5 text-left">Priority</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Submitter</th>
                  <th className="px-4 py-2.5 text-left">Filed</th>
                  <th className="px-4 py-2.5 text-left" />
                </tr>
              </thead>
              <tbody>
                {data.tickets.map(ticket => (
                  <TicketRow key={ticket.id} ticket={ticket} />
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.last_page > 1 && (
          <div className="flex items-center justify-between mt-4 text-xs text-surface-500">
            <span>{data.pagination.total} tickets</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <span>Page {page} of {data.pagination.last_page}</span>
              <Button size="sm" variant="secondary" disabled={page === data.pagination.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Create modal */}
      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} />}
    </motion.div>
  );
}

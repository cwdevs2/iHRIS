import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Send, Lock, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTicket, useUpdateTicket, useAddNote, type TicketStatus } from '@/hooks/useTickets';
import { useAuthStore } from '@/stores/auth';
import { easeOutStrong } from '@/lib/motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const STATUS_BADGE: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  open:         'info',
  in_progress:  'warning',
  pending_info: 'warning',
  resolved:     'success',
  closed:       'default',
  cancelled:    'danger',
};

const PRIORITY_BADGE: Record<string, 'default' | 'warning' | 'danger' | 'info'> = {
  low:    'default',
  normal: 'info',
  high:   'warning',
  urgent: 'danger',
};

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open:         ['in_progress', 'pending_info', 'cancelled'],
  in_progress:  ['pending_info', 'resolved', 'cancelled'],
  pending_info: ['in_progress', 'resolved', 'cancelled'],
  resolved:     ['closed', 'open'],
  closed:       [],
  cancelled:    [],
};

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOutStrong } },
};

export function TicketDetailPage() {
  const { id }        = useParams<{ id: string }>();
  const navigate      = useNavigate();
  const hasManage     = useAuthStore(s => s.hasPermission('hr.tickets.manage'));
  const currentUserId = useAuthStore(s => s.user?.id);
  const [isInternal, setIsInternal] = useState(false);

  const { data, isLoading } = useTicket(id ?? '');
  const update  = useUpdateTicket();
  const addNote = useAddNote(id ?? '');

  const { register, handleSubmit, reset } = useForm<{ body: string }>();

  const ticket = data?.ticket;

  const onNote = handleSubmit(async ({ body }) => {
    if (!id) return;
    await addNote.mutateAsync({ body, is_internal: isInternal });
    reset();
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-100" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-100" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-surface-500">Ticket not found.</p>
        <Button variant="secondary" onClick={() => navigate('/tickets')}>Back</Button>
      </div>
    );
  }

  const nextTransitions = TRANSITIONS[ticket.status] ?? [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 max-w-4xl">
      {/* Back */}
      <motion.div variants={itemVariants}>
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/tickets')}>
          All Tickets
        </Button>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <p className="font-mono text-xs text-surface-400">{ticket.ticket_number}</p>
              <h1 className="text-xl font-semibold text-surface-900">{ticket.subject}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={STATUS_BADGE[ticket.status]} className="capitalize">{ticket.status.replace('_', ' ')}</Badge>
                <Badge variant={PRIORITY_BADGE[ticket.priority]} className="capitalize">{ticket.priority}</Badge>
                <Badge variant="info" className="capitalize">{ticket.category}</Badge>
              </div>
            </div>

            {/* Transitions (HR only) */}
            {hasManage && nextTransitions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-surface-500">Move to:</span>
                {nextTransitions.map(next => (
                  <Button
                    key={next}
                    size="sm"
                    variant="secondary"
                    loading={update.isPending}
                    onClick={() => update.mutate({ id: ticket.id, status: next })}
                    className="capitalize"
                  >
                    {next.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-surface-100 pt-4 text-xs">
            <div>
              <p className="text-surface-400 uppercase tracking-wide">Submitted by</p>
              <p className="text-surface-700 mt-0.5 font-medium">
                {ticket.submitter ? `${ticket.submitter.first_name} ${ticket.submitter.last_name}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-surface-400 uppercase tracking-wide">Assigned to</p>
              <p className="text-surface-700 mt-0.5 font-medium">
                {ticket.assignee ? `${ticket.assignee.first_name} ${ticket.assignee.last_name}` : 'Unassigned'}
              </p>
            </div>
            <div>
              <p className="text-surface-400 uppercase tracking-wide">Filed</p>
              <p className="text-surface-700 mt-0.5 font-medium">{dayjs(ticket.created_at).format('MMM D, YYYY HH:mm')}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4 rounded-lg bg-surface-50 p-4 text-sm text-surface-700 whitespace-pre-wrap">
            {ticket.description}
          </div>

          {/* Resolution note */}
          {ticket.resolution_note && (
            <div className="mt-4 rounded-lg border border-green-100 bg-green-50 p-4 text-sm text-green-800">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Resolution</p>
              {ticket.resolution_note}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Notes thread */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-surface-700 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Conversation
          {ticket.notes?.length ? <span className="text-surface-400">· {ticket.notes.length}</span> : null}
        </h2>

        {!ticket.notes?.length ? (
          <p className="text-sm text-surface-400 italic">No messages yet. Add a note below.</p>
        ) : (
          ticket.notes.map(note => (
            <Card key={note.id} className={`p-4 ${note.is_internal ? 'border-amber-200 bg-amber-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-200 text-xs font-bold text-brand-700">
                  {note.author ? `${note.author.first_name[0]}${note.author.last_name[0]}` : '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-surface-900">
                      {note.author ? `${note.author.first_name} ${note.author.last_name}` : 'Unknown'}
                    </p>
                    {note.is_internal && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
                        <Lock className="h-3 w-3" /> Internal
                      </span>
                    )}
                    <span className="ml-auto text-xs text-surface-400">{dayjs(note.created_at).fromNow()}</span>
                  </div>
                  <p className="mt-1 text-sm text-surface-700 whitespace-pre-wrap">{note.body}</p>
                </div>
              </div>
            </Card>
          ))
        )}

        {/* Reply form */}
        {ticket.status !== 'closed' && ticket.status !== 'cancelled' && (
          <Card className="p-4">
            <form onSubmit={onNote} className="flex flex-col gap-3">
              <textarea
                {...register('body', { required: true })}
                rows={3}
                placeholder="Write a reply…"
                className="input-field resize-none"
              />
              <div className="flex items-center justify-between gap-4">
                {hasManage && (
                  <label className="flex items-center gap-2 text-xs text-surface-600 cursor-pointer">
                    <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="accent-amber-500 h-3.5 w-3.5" />
                    <Lock className="h-3 w-3 text-amber-500" />
                    Internal note (only visible to HR)
                  </label>
                )}
                <Button type="submit" size="sm" variant="primary" loading={addNote.isPending} leftIcon={<Send className="h-3.5 w-3.5" />} className="ml-auto">
                  Send
                </Button>
              </div>
            </form>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}

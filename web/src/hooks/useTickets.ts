import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, unwrap } from '@/lib/api';
import type { JSendEnvelope, Pagination } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus   = 'open' | 'in_progress' | 'pending_info' | 'resolved' | 'closed' | 'cancelled';
export type TicketCategory = 'payroll' | 'leave' | 'benefits' | 'grievance' | 'general' | 'other';

export interface TicketNote {
  id: string;
  ticket_id: string;
  author_id: string;
  author: { id: string; first_name: string; last_name: string; avatar_path: string | null } | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  submitter_id: string;
  submitter: { id: string; first_name: string; last_name: string } | null;
  assignee_id: string | null;
  assignee: { id: string; first_name: string; last_name: string } | null;
  employee_id: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_note: string | null;
  notes?: TicketNote[];
  notes_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TicketListResponse {
  tickets: Ticket[];
  pagination: Pagination;
}

// ─── API ─────────────────────────────────────────────────────────────────────

type TicketFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  search?: string;
  per_page?: number;
  page?: number;
};

const ticketApi = {
  list: (filters?: TicketFilters) =>
    unwrap(api.get<JSendEnvelope<TicketListResponse>>('/tickets', { params: filters })),
  get: (id: string) =>
    unwrap(api.get<JSendEnvelope<{ ticket: Ticket }>>(`/tickets/${id}`)),
  create: (data: { category: string; subject: string; description: string; priority?: TicketPriority; employee_id?: string }) =>
    unwrap(api.post<JSendEnvelope<{ ticket: Ticket }>>('/tickets', data)),
  update: (id: string, data: { status?: TicketStatus; assignee_id?: string | null; priority?: TicketPriority; resolution_note?: string }) =>
    unwrap(api.patch<JSendEnvelope<{ ticket: Ticket }>>(`/tickets/${id}`, data)),
  addNote: (id: string, body: string, is_internal?: boolean) =>
    unwrap(api.post<JSendEnvelope<{ note: TicketNote }>>(`/tickets/${id}/notes`, { body, is_internal })),
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

const keys = {
  list: (filters?: TicketFilters) => ['tickets', filters] as const,
  detail: (id: string) => ['tickets', id] as const,
};

export function useTickets(filters?: TicketFilters) {
  return useQuery({ queryKey: keys.list(filters), queryFn: () => ticketApi.list(filters) });
}

export function useTicket(id: string) {
  return useQuery({ queryKey: keys.detail(id), queryFn: () => ticketApi.get(id), enabled: Boolean(id) });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ticketApi.create,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['tickets'] }); toast.success('Ticket filed.'); },
    onError: () => toast.error('Failed to file ticket.'),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof ticketApi.update>[1]) =>
      ticketApi.update(id, data),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: keys.detail(id) });
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket updated.');
    },
    onError: () => toast.error('Update failed.'),
  });
}

export function useAddNote(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, is_internal }: { body: string; is_internal?: boolean }) =>
      ticketApi.addNote(ticketId, body, is_internal),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.detail(ticketId) });
      toast.success('Note added.');
    },
    onError: () => toast.error('Failed to add note.'),
  });
}

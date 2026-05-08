import { useState } from 'react';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { usePostings, useCreatePosting, useUpdatePosting } from '@/hooks/useRecruitment';
import { useAuthStore } from '@/stores/auth';
import type {
  PostingFilters,
  PostingStatus,
  EmploymentType,
  CreatePostingPayload,
} from '@/types';

const STATUS_VARIANT: Record<PostingStatus, 'default' | 'success' | 'warning' | 'info'> = {
  draft: 'default',
  published: 'success',
  closed: 'warning',
  archived: 'default',
};

const EMPLOYMENT_TYPES: EmploymentType[] = [
  'regular', 'probationary', 'contractual', 'part_time', 'project_based',
];

interface Props {
  externalOpenCreate?: boolean;
  onCreateClose?: () => void;
}

export function PostingsTab({ externalOpenCreate, onCreateClose }: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [filters, setFilters] = useState<PostingFilters>({ per_page: 25 });
  const [createOpen, setCreateOpen] = useState(false);
  const isDialogOpen = createOpen || !!externalOpenCreate;
  const closeDialog = () => {
    setCreateOpen(false);
    onCreateClose?.();
  };

  const { data, isLoading } = usePostings(filters);
  const createPosting = useCreatePosting();

  const postings = data?.postings ?? [];

  const [form, setForm] = useState<Partial<CreatePostingPayload>>({
    employment_type: 'regular',
    show_salary: false,
    status: 'draft',
  });

  const handleCreate = () => {
    if (!form.title || !form.employment_type) return;
    createPosting.mutate(form as CreatePostingPayload, { onSuccess: closeDialog });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search postings…"
          className="input-field h-10 w-[220px]"
          value={filters.search ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value || undefined }))}
        />
        <select
          className="input-field h-10 w-[160px]"
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((p) => ({ ...p, status: (e.target.value || undefined) as PostingStatus }))
          }
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
        <span className="ml-auto text-sm text-surface-500">
          {data?.pagination ? `${data.pagination.total} postings` : '—'}
        </span>
        {hasPermission('recruitment.jobs.create') && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New Posting
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                {['Title', 'Type', 'Location', 'Status', 'Applicants', 'Published', 'Closes', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-surface-50">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-3/4 animate-pulse rounded bg-surface-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : postings.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-surface-400">
                        No job postings found.
                      </td>
                    </tr>
                  )
                : postings.map((p) => (
                    <tr key={p.id} className="border-b border-surface-50 hover:bg-surface-50">
                      <td className="px-4 py-3 font-medium text-surface-900">{p.title}</td>
                      <td className="px-4 py-3 text-surface-600 capitalize">{p.employment_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-surface-600">{p.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[p.status]} className="capitalize">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-surface-600">{p.applicants_count ?? 0}</td>
                      <td className="px-4 py-3 text-surface-500">
                        {p.published_at ? dayjs(p.published_at).format('MMM D, YYYY') : '—'}
                      </td>
                      <td className="px-4 py-3 text-surface-500">
                        {p.closes_at ? dayjs(p.closes_at).format('MMM D, YYYY') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {hasPermission('recruitment.jobs.create') && (
                          <PostingToggle
                            id={p.id}
                            currentStatus={p.status}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onClose={closeDialog} title="New Job Posting">
        <div className="flex flex-col gap-4">
          <div>
            <label className="field-label">Title *</label>
            <input
              type="text"
              className="input-field h-10 w-full"
              value={form.title ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Employment Type</label>
              <select
                className="input-field h-10 w-full"
                value={form.employment_type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, employment_type: e.target.value as EmploymentType }))
                }
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Location</label>
              <input
                type="text"
                className="input-field h-10 w-full"
                value={form.location ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Description</label>
            <textarea
              rows={3}
              className="input-field w-full resize-none"
              value={form.description ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="field-label">Closes At</label>
            <input
              type="date"
              className="input-field h-10 w-full"
              value={form.closes_at ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, closes_at: e.target.value }))}
            />
          </div>

          <div>
            <label className="field-label">Publish as</label>
            <select
              className="input-field h-10 w-full"
              value={form.status ?? 'draft'}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value as 'draft' | 'published' }))
              }
            >
              <option value="draft">Save as Draft</option>
              <option value="published">Publish Now</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeDialog}>Cancel</Button>
            <Button size="sm" loading={createPosting.isPending} onClick={handleCreate}>
              Create Posting
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function PostingToggle({ id, currentStatus }: { id: string; currentStatus: PostingStatus }) {
  const update = useUpdatePosting(id);
  if (currentStatus === 'archived') return null;
  const isPublished = currentStatus === 'published';

  return (
    <button
      type="button"
      disabled={update.isPending}
      onClick={() =>
        update.mutate({ status: isPublished ? 'closed' : 'published' })
      }
      className={`text-xs font-medium cursor-pointer transition-colors ${
        isPublished
          ? 'text-amber-600 hover:text-amber-700'
          : 'text-green-600 hover:text-green-700'
      }`}
    >
      {isPublished ? 'Close' : 'Publish'}
    </button>
  );
}

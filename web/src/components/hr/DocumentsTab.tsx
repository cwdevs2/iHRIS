import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  FileBadge,
  AlertTriangle,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useDownloadDocument,
} from '@/hooks/useDocuments';
import type { EmployeeDocument, DocumentCategory } from '@/types';
import { easeOutStrong } from '@/lib/motion';
import { cn } from '@/lib/cn';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

// ─── Upload form ──────────────────────────────────────────────────────────────

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'contract',    label: 'Contract' },
  { value: 'id',          label: 'Government ID' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'medical',     label: 'Medical' },
  { value: 'memo',        label: 'Memo / Notice' },
  { value: 'other',       label: 'Other' },
];

const CATEGORY_ICONS: Record<DocumentCategory, typeof FileText> = {
  contract:    FileText,
  id:          FileBadge,
  certificate: FileBadge,
  medical:     FileText,
  memo:        FileText,
  other:       FileText,
};

const uploadSchema = z.object({
  title:      z.string().min(1, 'Title is required').max(255),
  category:   z.enum(['contract', 'id', 'certificate', 'medical', 'memo', 'other']),
  description: z.string().max(1000).optional(),
  expires_at: z.string().optional(),
  is_private: z.boolean().optional(),
});
type UploadForm = z.infer<typeof uploadSchema>;

interface UploadModalProps {
  employeeId: string;
  onClose: () => void;
}

function UploadModal({ employeeId, onClose }: UploadModalProps) {
  const upload   = useUploadDocument(employeeId);
  const fileRef  = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { category: 'other', is_private: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', values.title);
    fd.append('category', values.category);
    if (values.description) fd.append('description', values.description);
    if (values.expires_at) fd.append('expires_at', values.expires_at);
    if (values.is_private) fd.append('is_private', '1');

    await upload.mutateAsync(fd);
    onClose();
  });

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <Dialog open onClose={onClose} title="Upload Document" maxWidth="lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            dragOver ? 'border-brand-400 bg-brand-50' : 'border-surface-200 hover:border-brand-300 hover:bg-surface-50',
          )}
        >
          <Upload className="h-7 w-7 text-surface-400" />
          {file ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-surface-900 truncate max-w-xs">{file.name}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-surface-400 hover:text-surface-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-surface-600">Drag & drop or <span className="text-brand-600 font-medium">browse file</span></p>
              <p className="text-xs text-surface-400">PDF, DOC, DOCX, images, spreadsheets — max 20 MB</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv,.txt,.zip"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-700">Title *</label>
            <input {...register('title')} placeholder="e.g. Employment Contract 2025" className="input-field" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-700">Category *</label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <select {...field} className="input-field">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-700">Expiry date</label>
            <input type="date" {...register('expires_at')} className="input-field" min={new Date().toISOString().split('T')[0]} />
          </div>

          <div className="flex items-center gap-2 self-end pb-1">
            <input type="checkbox" id="is_private" {...register('is_private')} className="h-4 w-4 rounded border-surface-300 accent-brand-600" />
            <label htmlFor="is_private" className="text-sm text-surface-700">Mark as sensitive / private</label>
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-surface-700">Description</label>
            <textarea {...register('description')} rows={2} className="input-field resize-none" placeholder="Optional notes…" />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            loading={upload.isPending}
            disabled={!file}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            Upload
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────

function expiryBadge(expiresAt: string | null) {
  if (!expiresAt) return null;
  const d   = dayjs(expiresAt);
  const diff = d.diff(dayjs(), 'day');
  if (diff < 0)  return <Badge variant="danger">Expired</Badge>;
  if (diff <= 30) return <Badge variant="warning">Expires {d.fromNow()}</Badge>;
  return <Badge variant="success">Expires {d.format('MMM D, YYYY')}</Badge>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocRowProps {
  doc: EmployeeDocument;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function DocRow({ doc, onDelete, isDeleting }: DocRowProps) {
  const download = useDownloadDocument();
  const Icon = CATEGORY_ICONS[doc.category] ?? FileText;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: easeOutStrong }}
      className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-900 leading-tight">{doc.title}</p>
            <p className="text-[11px] text-surface-400 mt-0.5 truncate max-w-[220px]">{doc.file_name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="info" className="capitalize">{doc.category.replace('_', ' ')}</Badge>
      </td>
      <td className="px-4 py-3 text-xs text-surface-500">{formatBytes(doc.file_size)}</td>
      <td className="px-4 py-3">{expiryBadge(doc.expires_at)}</td>
      <td className="px-4 py-3 text-xs text-surface-400">{dayjs(doc.created_at).format('MMM D, YYYY')}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => download.mutate(doc.id)}
            loading={download.isPending}
            aria-label="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-red-500 hover:text-red-600"
            onClick={() => onDelete(doc.id)}
            loading={isDeleting}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DocumentsTabProps {
  employeeId: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.04 } },
};

export function DocumentsTab({ employeeId }: DocumentsTabProps) {
  const [showUpload, setShowUpload]   = useState(false);
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState<string>('');

  const { data, isLoading } = useDocuments(employeeId, { page, search: search || undefined, category: category as DocumentCategory || undefined });
  const deleteDoc = useDeleteDocument(employeeId);

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteDoc.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search documents…"
          className="input-field flex-1 max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="input-field w-44"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="ml-auto">
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowUpload(true)}
          >
            Upload
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-100" />
          ))}
        </div>
      ) : !data?.documents?.length ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-surface-900">No documents</p>
          <p className="text-xs text-surface-500">Upload contracts, IDs, and certificates.</p>
          <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowUpload(true)}>
            Upload first document
          </Button>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="overflow-hidden rounded-xl border border-surface-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-xs font-medium text-surface-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Document</th>
                <th className="px-4 py-2.5 text-left">Category</th>
                <th className="px-4 py-2.5 text-left">Size</th>
                <th className="px-4 py-2.5 text-left">Expiry</th>
                <th className="px-4 py-2.5 text-left">Uploaded</th>
                <th className="px-4 py-2.5 text-left" />
              </tr>
            </thead>
            <AnimatePresence initial={false}>
              <tbody>
                {data.documents.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    onDelete={(id) => setDeleteId(id)}
                    isDeleting={deleteDoc.isPending && deleteId === doc.id}
                  />
                ))}
              </tbody>
            </AnimatePresence>
          </table>
        </motion.div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.last_page > 1 ? (
        <div className="flex items-center justify-between text-xs text-surface-500">
          <span>{data.pagination.total} documents</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span>Page {page} of {data.pagination.last_page}</span>
            <Button size="sm" variant="secondary" disabled={page === data.pagination.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      ) : null}

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && <UploadModal employeeId={employeeId} onClose={() => setShowUpload(false)} />}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <Dialog open onClose={() => setDeleteId(null)} title="Delete Document" maxWidth="sm">
            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <p className="text-sm text-surface-700">
                  This document will be permanently deleted from storage. This cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
                <Button variant="danger" onClick={confirmDelete} loading={deleteDoc.isPending} leftIcon={<Trash2 className="h-4 w-4" />}>
                  Delete
                </Button>
              </div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { Plus, Search, Pencil, Trash2, ShieldCheck, ChevronLeft, ChevronRight, UserRound } from 'lucide-react';
import dayjs from 'dayjs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { UserFormModal } from '@/components/hr/UserFormModal';
import { useUsers, useDeleteUser } from '@/hooks/useUsers';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import type { SystemUser, UserFilters } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutStrong } },
};

const STATUS_BADGE: Record<SystemUser['status'], { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  active:    { label: 'Active',    variant: 'success' },
  inactive:  { label: 'Inactive',  variant: 'warning' },
  suspended: { label: 'Suspended', variant: 'danger' },
};

export function UsersPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('users.accounts.create');
  const canEdit   = hasPermission('users.accounts.edit');
  const canDelete = hasPermission('users.accounts.delete');

  const [filters, setFilters]           = useState<UserFilters>({ per_page: 15, page: 1 });
  const [search, setSearch]             = useState('');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingUser, setEditingUser]   = useState<SystemUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);

  const { data, isLoading } = useUsers({ ...filters, search: search || undefined });
  const deleteUser = useDeleteUser();

  const users      = data?.users ?? [];
  const pagination = data?.pagination;

  const columns: ColumnDef<SystemUser>[] = [
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-3">
            {u.avatar_url ? (
              <img src={u.avatar_url} alt={u.full_name} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {u.first_name[0]}{u.last_name[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-surface-900 truncate">{u.full_name}</p>
              <p className="text-xs text-surface-500">{u.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'roles',
      header: 'Roles',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.length === 0 ? (
            <span className="text-xs text-surface-400">No role</span>
          ) : (
            row.original.roles.map((r) => (
              <span key={r.id} className="inline-flex items-center gap-0.5 rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-700 ring-1 ring-inset ring-surface-200">
                <ShieldCheck className="h-2.5 w-2.5 text-brand-500" />
                {r.display_name}
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue<SystemUser['status']>();
        const cfg = STATUS_BADGE[s];
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      accessorKey: 'last_login_at',
      header: 'Last login',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return <span className="text-sm text-surface-600">{v ? dayjs(v).format('MMM D, YYYY') : 'Never'}</span>;
      },
    },
    {
      accessorKey: 'mfa_enabled',
      header: 'MFA',
      cell: ({ getValue }) => (
        <Badge variant={getValue<boolean>() ? 'success' : 'default'}>
          {getValue<boolean>() ? 'On' : 'Off'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-1 justify-end">
            {canEdit ? (
              <button
                type="button"
                onClick={() => { setEditingUser(u); setModalOpen(true); }}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors"
                aria-label={`Edit ${u.full_name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => setDeleteTarget(u)}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                aria-label={`Deactivate ${u.full_name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: pagination?.total ?? 0,
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">User Accounts</h1>
          <p className="mt-0.5 text-sm text-surface-500">
            {pagination ? `${pagination.total} total users` : 'Loading…'}
          </p>
        </div>
        {canCreate ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditingUser(null); setModalOpen(true); }}>
            Create user
          </Button>
        ) : null}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setFilters((p) => ({ ...p, page: 1 })); }}
            className="h-10 w-full rounded-lg border border-surface-200 bg-surface-0 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, status: (e.target.value as SystemUser['status']) || undefined, page: 1 }))}
          className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-surface-100">
                    {hg.headers.map((h) => (
                      <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-surface-50">
                      {columns.map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-3/4 animate-pulse rounded bg-surface-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                          <UserRound className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-900">No users found</p>
                          <p className="mt-0.5 text-xs text-surface-500">
                            {search ? 'Try a different search term.' : 'Create the first user account.'}
                          </p>
                        </div>
                        {canCreate && !search ? (
                          <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setEditingUser(null); setModalOpen(true); }}>
                            Create user
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.last_page > 1 ? (
            <div className="flex items-center justify-between border-t border-surface-100 px-4 py-3">
              <p className="text-xs text-surface-500">
                Showing {(pagination.current_page - 1) * pagination.per_page + 1}–
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" disabled={pagination.current_page <= 1} onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-500 hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button key={page} type="button" onClick={() => setFilters((p) => ({ ...p, page }))} className={cn('grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-xs font-medium transition-colors', page === pagination.current_page ? 'bg-brand-600 text-white' : 'text-surface-600 hover:bg-surface-100')}>
                      {page}
                    </button>
                  );
                })}
                <button type="button" disabled={pagination.current_page >= pagination.last_page} onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-500 hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </Card>
      </motion.div>

      {/* Modal */}
      <UserFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingUser(null); }}
        user={editingUser}
      />

      {/* Delete confirm */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-sm rounded-2xl bg-surface-0 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-surface-900">Deactivate user?</h3>
            <p className="mt-2 text-sm text-surface-600">
              <strong>{deleteTarget.full_name}</strong>'s account will be deactivated. They will no longer be able to log in.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" loading={deleteUser.isPending} onClick={async () => { await deleteUser.mutateAsync(deleteTarget.id); setDeleteTarget(null); }}>
                Deactivate
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  );
}

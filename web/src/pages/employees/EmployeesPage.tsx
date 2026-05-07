import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import dayjs from 'dayjs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmploymentStatusBadge } from '@/components/hr/EmploymentStatusBadge';
import { EmployeeFormModal } from '@/components/hr/EmployeeFormModal';
import { useEmployees, useDeleteEmployee } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useOrganization';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import type { Employee, EmployeeFilters } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutStrong } },
};

export function EmployeesPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('hr.employees.create');
  const canEdit = hasPermission('hr.employees.edit');
  const canDelete = hasPermission('hr.employees.delete');

  const [filters, setFilters] = useState<EmployeeFilters>({ per_page: 15, page: 1 });
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const { data, isLoading } = useEmployees({ ...filters, search: search || undefined });
  const { data: deptData } = useDepartments({ all: true });
  const deleteEmployee = useDeleteEmployee();

  const employees = data?.employees ?? [];
  const pagination = data?.pagination;

  const columns: ColumnDef<Employee>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {emp.first_name?.[0]}{emp.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-surface-900 truncate">
                {emp.full_name ?? '—'}
              </p>
              <p className="text-xs text-surface-500">{emp.employee_number}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'department',
      header: 'Department / Position',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-surface-900">{row.original.department?.name ?? '—'}</span>
          <span className="text-xs text-surface-500">{row.original.position?.title ?? '—'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'employment_status',
      header: 'Status',
      cell: ({ getValue }) => <EmploymentStatusBadge status={getValue<Employee['employment_status']>()} />,
    },
    {
      accessorKey: 'date_hired',
      header: 'Hired',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return <span className="text-sm text-surface-700">{v ? dayjs(v).format('MMM D, YYYY') : '—'}</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const emp = row.original;
        return (
          <div className="flex items-center gap-1 justify-end">
            {canEdit ? (
              <button
                type="button"
                onClick={() => { setEditingEmployee(emp); setModalOpen(true); }}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors"
                aria-label={`Edit ${emp.full_name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => setDeleteTarget(emp)}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                aria-label={`Archive ${emp.full_name}`}
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
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: pagination?.total ?? 0,
  });

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Employees</h1>
          <p className="mt-0.5 text-sm text-surface-500">
            {pagination ? `${pagination.total} total records` : 'Loading…'}
          </p>
        </div>
        {canCreate ? (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => { setEditingEmployee(null); setModalOpen(true); }}
          >
            Add employee
          </Button>
        ) : null}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="search"
            placeholder="Search by name, email, or employee number…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setFilters((p) => ({ ...p, page: 1 })); }}
            className="h-10 w-full rounded-lg border border-surface-200 bg-surface-0 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
          />
        </div>

        <select
          value={filters.department_id ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, department_id: e.target.value || undefined, page: 1 }))}
          className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          <option value="">All departments</option>
          {deptData?.departments?.map((d: { id: string; name: string }) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select
          value={filters.employment_status ?? ''}
          onChange={(e) => setFilters((p) => ({ ...p, employment_status: (e.target.value as Employee['employment_status']) || undefined, page: 1 }))}
          className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          <option value="">All statuses</option>
          <option value="regular">Regular</option>
          <option value="probationary">Probationary</option>
          <option value="contractual">Contractual</option>
          <option value="part_time">Part-time</option>
          <option value="project_based">Project-based</option>
          <option value="on_leave">On Leave</option>
          <option value="resigned">Resigned</option>
          <option value="terminated">Terminated</option>
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
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-surface-500"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
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
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-100 text-surface-400">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-900">No employees found</p>
                          <p className="mt-0.5 text-xs text-surface-500">
                            {search ? 'Try a different search term.' : 'Add your first employee to get started.'}
                          </p>
                        </div>
                        {canCreate && !search ? (
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Plus className="h-3.5 w-3.5" />}
                            onClick={() => { setEditingEmployee(null); setModalOpen(true); }}
                          >
                            Add employee
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
                <button
                  type="button"
                  disabled={pagination.current_page <= 1}
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-500 hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => handlePageChange(page)}
                      className={cn(
                        'grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-xs font-medium transition-colors',
                        page === pagination.current_page
                          ? 'bg-brand-600 text-white'
                          : 'text-surface-600 hover:bg-surface-100',
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={pagination.current_page >= pagination.last_page}
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-500 hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </Card>
      </motion.div>

      {/* Create / Edit Modal */}
      <EmployeeFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEmployee(null); }}
        employee={editingEmployee}
      />

      {/* Delete Confirm Dialog */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-sm rounded-2xl bg-surface-0 p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-surface-900">Archive employee?</h3>
            <p className="mt-2 text-sm text-surface-600">
              This will soft-delete <strong>{deleteTarget.full_name ?? deleteTarget.employee_number}</strong>.
              The record can be restored by a Super Admin.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                variant="danger"
                loading={deleteEmployee.isPending}
                onClick={async () => {
                  await deleteEmployee.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Archive
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  );
}

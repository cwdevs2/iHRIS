import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Calendar,
  User,
  FileText,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import {
  useAdminAttendance,
  useAdminCorrections,
  useApproveCorrection,
  useRejectCorrection,
  useManualAttendanceEntry,
} from '@/hooks/useAdminAttendance';
import type { AttendanceLog, AttendanceCorrectionRequest } from '@/types';
import { useEmployees } from '@/hooks/useEmployees';

/* ─── types ─────────────────────────────────────────────────── */
type Tab = 'logs' | 'corrections' | 'manual';

type AdminAttendanceLog = AttendanceLog & {
  employee?: {
    user?: { first_name: string; last_name: string };
    position?: { name: string };
    department?: { name: string };
  };
};

type AdminCorrectionRequest = AttendanceCorrectionRequest & {
  employee?: {
    user?: { first_name: string; last_name: string };
    department?: { name: string };
  };
};

/* ─── schema ─────────────────────────────────────────────────── */
const manualSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  work_date: z.string().min(1, 'Date is required'),
  clock_in_at: z.string().optional(),
  clock_out_at: z.string().optional(),
  status: z.enum(['present', 'late', 'undertime', 'absent', 'on_leave', 'holiday']),
  remarks: z.string().optional(),
});
type ManualFormValues = z.infer<typeof manualSchema>;

/* ─── helpers ────────────────────────────────────────────────── */
const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  present: 'success',
  late: 'warning',
  undertime: 'warning',
  absent: 'danger',
  on_leave: 'default',
  holiday: 'default',
};

function empName(log: AdminAttendanceLog | AdminCorrectionRequest) {
  const u = log.employee?.user;
  if (!u) return 'Unknown';
  return `${u.first_name} ${u.last_name}`.trim();
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/* ─── page ────────────────────────────────────────────────────── */
export function AdminAttendanceManagementPage() {
  const [tab, setTab] = useState<Tab>('logs');
  const today = dayjs().format('YYYY-MM-DD');

  const tabs: { key: Tab; label: string; icon: typeof Clock }[] = [
    { key: 'logs', label: 'Attendance Logs', icon: Clock },
    { key: 'corrections', label: 'Correction Requests', icon: AlertCircle },
    { key: 'manual', label: 'Manual Entry', icon: Plus },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Attendance Management</h1>
          <p className="text-sm text-surface-500">Review logs, process corrections, and create manual entries</p>
        </div>
        <Badge variant="default">{dayjs().format('dddd, MMM D YYYY')}</Badge>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-surface-200 bg-surface-50/60 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
              tab === key
                ? 'bg-surface-0 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200'
                : 'text-surface-500 hover:text-surface-700',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: easeOutStrong }}
        >
          {tab === 'logs' && <LogsTab today={today} />}
          {tab === 'corrections' && <CorrectionsTab />}
          {tab === 'manual' && <ManualEntryTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── Logs Tab ────────────────────────────────────────────────── */
function LogsTab({ today }: { today: string }) {
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAdminAttendance({ from: dateFrom, to: dateTo, per_page: 100 });
  const logs = (data?.logs ?? []) as AdminAttendanceLog[];

  const filtered = search
    ? logs.filter((l) => empName(l).toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="search"
            placeholder="Search employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-surface-200 bg-surface-0 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-surface-600">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-surface-600">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
          />
        </div>
        <span className="ml-auto text-xs text-surface-500">
          <span className="font-medium text-surface-900 tabular-nums">{filtered.length}</span> records
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/60">
                {['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Source'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-surface-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-surface-500">Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-surface-500">No records found.</td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const name = empName(log);
                  const clockIn = log.clock_in_at ? dayjs(log.clock_in_at).format('h:mm A') : '—';
                  const clockOut = log.clock_out_at ? dayjs(log.clock_out_at).format('h:mm A') : '—';
                  const hours = parseFloat(log.regular_hours || '0') + parseFloat(log.overtime_hours || '0');
                  return (
                    <tr key={log.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50 transition-colors duration-200">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                            {initials(name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-surface-900">{name}</p>
                            <p className="text-xs text-surface-500">{log.employee?.position?.name ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums text-surface-700">{dayjs(log.work_date).format('MMM D, YYYY')}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-surface-700">{clockIn}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-surface-700">{clockOut}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-surface-700">{hours > 0 ? `${hours.toFixed(1)}h` : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[log.status] ?? 'default'}>
                          {log.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-surface-500">{log.source}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ─── Corrections Tab ─────────────────────────────────────────── */
function CorrectionsTab() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const { data, isLoading } = useAdminCorrections(
    statusFilter === 'all' ? {} : { status: statusFilter },
  );
  const corrections = (data?.corrections ?? []) as AdminCorrectionRequest[];
  const approve = useApproveCorrection();
  const reject = useRejectCorrection();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <span className="text-xs text-surface-500">
          <span className="font-medium text-surface-900 tabular-nums">{corrections.length}</span> requests
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/60">
                {['Employee', 'Date', 'Req. Clock In', 'Req. Clock Out', 'Reason', 'Status', 'Filed', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-surface-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-surface-500">Loading…</td></tr>
              ) : corrections.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-surface-500">No correction requests found.</td></tr>
              ) : (
                corrections.map((c) => {
                  const name = empName(c);
                  const isPending = c.status === 'pending';
                  return (
                    <tr key={c.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50 transition-colors duration-200">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                            {initials(name)}
                          </div>
                          <p className="text-sm font-medium text-surface-900">{name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums text-surface-700">{dayjs(c.work_date).format('MMM D, YYYY')}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-surface-700">
                        {c.requested_clock_in ? dayjs(c.requested_clock_in).format('h:mm A') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums text-surface-700">
                        {c.requested_clock_out ? dayjs(c.requested_clock_out).format('h:mm A') : '—'}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate text-sm text-surface-600">{c.reason}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status === 'approved' ? 'success' : c.status === 'rejected' ? 'danger' : 'warning'}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-500 tabular-nums">{dayjs(c.created_at).format('MMM D')}</td>
                      <td className="px-4 py-3">
                        {isPending && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => approve.mutate({ id: c.id })}
                              disabled={approve.isPending}
                              className="flex items-center gap-1 rounded-md bg-cta-500/10 px-2 py-1 text-xs font-medium text-cta-700 transition-colors hover:bg-cta-500/20 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => reject.mutate({ id: c.id, note: 'Rejected by admin' })}
                              disabled={reject.isPending}
                              className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle className="h-3 w-3" />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ─── Manual Entry Tab ────────────────────────────────────────── */
function ManualEntryTab() {
  const { data: empData } = useEmployees();
  const employees = empData?.employees ?? [];
  const save = useManualAttendanceEntry();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualFormValues>({
    resolver: zodResolver(manualSchema),
    defaultValues: { status: 'present' },
  });

  const onSubmit = (values: ManualFormValues) => {
    const payload = {
      ...values,
      clock_in_at: values.clock_in_at || undefined,
      clock_out_at: values.clock_out_at || undefined,
    };
    save.mutate(payload, {
      onSuccess: () => {
        toast.success('Attendance record created.');
        reset({ status: 'present' });
      },
    });
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Create Manual Attendance Entry</h3>
            <p className="text-xs text-surface-500">Use this to add or correct attendance records for any employee.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Employee */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-surface-700">
                <User className="h-3.5 w-3.5" /> Employee *
              </label>
              <select
                {...register('employee_id')}
                className="h-10 w-full rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600"
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.user?.first_name} {e.user?.last_name}
                    {e.position?.name ? ` — ${e.position.name}` : ''}
                  </option>
                ))}
              </select>
              {errors.employee_id && <p className="text-xs text-red-600">{errors.employee_id.message}</p>}
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-surface-700">
                <Calendar className="h-3.5 w-3.5" /> Work Date *
              </label>
              <input
                type="date"
                {...register('work_date')}
                className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600"
              />
              {errors.work_date && <p className="text-xs text-red-600">{errors.work_date.message}</p>}
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-surface-700">
                  <Clock className="h-3.5 w-3.5" /> Clock In
                </label>
                <input
                  type="time"
                  {...register('clock_in_at')}
                  className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-surface-700">
                  <Clock className="h-3.5 w-3.5" /> Clock Out
                </label>
                <input
                  type="time"
                  {...register('clock_out_at')}
                  className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600"
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-surface-700">Status *</label>
              <select
                {...register('status')}
                className="h-10 w-full rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="undertime">Undertime</option>
                <option value="absent">Absent</option>
                <option value="on_leave">On Leave</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>

            {/* Remarks */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-surface-700">
                <FileText className="h-3.5 w-3.5" /> Remarks
              </label>
              <textarea
                {...register('remarks')}
                rows={3}
                placeholder="Optional notes about this entry…"
                className="w-full rounded-lg border border-surface-200 bg-surface-0 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-surface-100 pt-4">
              <Button type="button" variant="secondary" onClick={() => reset({ status: 'present' })}>
                Reset
              </Button>
              <Button type="submit" variant="primary" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save Entry'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

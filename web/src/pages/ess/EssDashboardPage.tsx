import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock,
  CalendarDays,
  Receipt,
  UserCircle,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  FileEdit,
  BellRing,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/auth';
import { useTodayAttendance, useMyLeaveBalances, useMyLeaveRequests } from '@/hooks/useEss';
import { useOwnPayslips } from '@/hooks/usePayroll';
import { formatPeso } from '@/lib/money';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import type { AttendanceLog, LeaveBalance } from '@/types';

/* ──────────────────────────────────────────────────────────────────
   Motion
   ────────────────────────────────────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOutStrong } },
};

/* ──────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────── */
function getGreeting(): string {
  const h = dayjs().hour();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function attendanceStatusMeta(log: AttendanceLog | null): {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'default';
  icon: typeof CheckCircle2;
} {
  if (!log) return { label: 'Not yet clocked in', variant: 'default', icon: AlertCircle };
  if (log.clock_out_at) return { label: 'Clocked out', variant: 'success', icon: CheckCircle2 };
  if (log.status === 'late') return { label: 'Clocked in (late)', variant: 'warning', icon: AlertCircle };
  return { label: 'Clocked in', variant: 'success', icon: CheckCircle2 };
}

/* ──────────────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────────────── */

function AttendanceCard({ log, isLoading }: { log: AttendanceLog | null; isLoading: boolean }) {
  const meta = attendanceStatusMeta(log);
  const StatusIcon = meta.icon;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Clock className="h-4.5 w-4.5" />
          </span>
          <span className="text-sm font-semibold text-surface-900">Today's Attendance</span>
        </div>
        <Link to="/ess/clock" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer transition-colors duration-150">
          {log?.clock_in_at && !log.clock_out_at ? 'Clock out' : 'Clock in'}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-surface-400" />
          <span className="text-sm text-surface-400">Loading…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Badge variant={meta.variant}>
            <StatusIcon className="h-3 w-3" />
            {meta.label}
          </Badge>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-xs text-surface-400">Clock In</p>
              <p className="text-base font-semibold text-surface-900 tabular-nums">
                {log?.clock_in_at ? dayjs(log.clock_in_at).format('h:mm A') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-400">Clock Out</p>
              <p className="text-base font-semibold text-surface-900 tabular-nums">
                {log?.clock_out_at ? dayjs(log.clock_out_at).format('h:mm A') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-400">Regular Hours</p>
              <p className="text-base font-semibold text-surface-900 tabular-nums">
                {log ? `${parseFloat(log.regular_hours).toFixed(1)}h` : '—'}
              </p>
            </div>
            {parseFloat(log?.overtime_hours ?? '0') > 0 && (
              <div>
                <p className="text-xs text-surface-400">Overtime</p>
                <p className="text-base font-semibold text-amber-700 tabular-nums">
                  +{parseFloat(log!.overtime_hours).toFixed(1)}h
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function LeaveBalancesCard({ balances, isLoading }: { balances: LeaveBalance[] | undefined; isLoading: boolean }) {
  const shown = (balances ?? []).filter((b) => b.credits > 0).slice(0, 4);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-cta-500/10 text-cta-600">
            <CalendarDays className="h-4.5 w-4.5" />
          </span>
          <span className="text-sm font-semibold text-surface-900">Leave Balances</span>
        </div>
        <Link to="/ess/leave" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer transition-colors duration-150">
          File leave
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-surface-400" />
          <span className="text-sm text-surface-400">Loading…</span>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-surface-400 py-2">No leave balances available.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((b) => {
            const pct = b.credits > 0 ? Math.min(100, (b.available / b.credits) * 100) : 0;
            return (
              <div key={b.leave_type.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-surface-700">{b.leave_type.name}</span>
                  <span className="text-xs tabular-nums text-surface-500">
                    <span className="font-semibold text-surface-900">{b.available}</span>/{b.credits} days
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: easeOutStrong }}
                    className={cn('h-full rounded-full', pct < 25 ? 'bg-danger' : pct < 60 ? 'bg-amber-400' : 'bg-cta-500')}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Quick actions
   ────────────────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { to: '/ess/clock',      label: 'Clock In / Out',    icon: Clock,       bg: 'bg-brand-50',     text: 'text-brand-600' },
  { to: '/ess/leave',      label: 'File Leave',        icon: CalendarDays,bg: 'bg-cta-500/10',   text: 'text-cta-600' },
  { to: '/my-payslips',    label: 'My Payslips',       icon: Receipt,     bg: 'bg-blue-50',      text: 'text-blue-600' },
  { to: '/ess/correction', label: 'Correction Request',icon: FileEdit,    bg: 'bg-amber-50',     text: 'text-amber-600' },
  { to: '/ess/profile',    label: 'My Profile',        icon: UserCircle,  bg: 'bg-purple-50',    text: 'text-purple-600' },
] as const;

/* ──────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */
export function EssDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: attendanceData, isLoading: attendanceLoading } = useTodayAttendance();
  const { data: balancesData, isLoading: balancesLoading } = useMyLeaveBalances();
  const { data: payslipsData } = useOwnPayslips();
  const { data: leaveData } = useMyLeaveRequests({ status: 'pending' });

  const latestPayslip = payslipsData?.payslips?.[0];
  const pendingLeaveCount = leaveData?.pagination?.total ?? 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <p className="text-sm text-surface-500">{dayjs().format('dddd, MMMM D, YYYY')}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-surface-900">
          {getGreeting()}, {user?.first_name}.
        </h1>
        <p className="text-sm text-surface-400">Your self-service portal — manage your attendance, leaves, and profile.</p>
      </motion.div>

      {/* Status banner — pending leave */}
      {pendingLeaveCount > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <BellRing className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <p className="text-sm text-amber-800">
              You have <strong>{pendingLeaveCount}</strong> pending leave {pendingLeaveCount === 1 ? 'request' : 'requests'} awaiting approval.
            </p>
            <Link to="/ess/leave" className="ml-auto text-xs font-medium text-amber-700 hover:text-amber-900 cursor-pointer whitespace-nowrap">
              View →
            </Link>
          </div>
        </motion.div>
      )}

      {/* Top cards grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AttendanceCard log={attendanceData?.log ?? null} isLoading={attendanceLoading} />
        <LeaveBalancesCard balances={balancesData?.balances} isLoading={balancesLoading} />
      </motion.div>

      {/* Latest payslip preview */}
      {latestPayslip && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Receipt className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-surface-900">Latest Payslip</p>
                  <p className="text-xs text-surface-400">
                    {latestPayslip.generated_at ? dayjs(latestPayslip.generated_at).format('MMMM D, YYYY') : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-surface-400">Net Pay</p>
                  <p className="text-lg font-semibold text-surface-900 tabular-nums">{formatPeso(latestPayslip.net_pay)}</p>
                </div>
                <Link
                  to={`/payroll/payslips/${latestPayslip.id}`}
                  className="inline-flex items-center justify-center h-8 rounded-lg border border-surface-200 bg-surface-0 px-3 text-xs font-medium text-surface-700 hover:bg-surface-50 transition-colors duration-150 cursor-pointer"
                >
                  View
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div variants={itemVariants}>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-400">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon, bg, text }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-2.5 rounded-xl border border-surface-200 p-4',
                'bg-surface-0 hover:bg-surface-50 transition-colors duration-150 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
              )}
            >
              <span className={cn('grid h-10 w-10 place-items-center rounded-xl', bg, text)}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-center text-xs font-medium text-surface-700 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Days Worked (Month)', value: '—', icon: TrendingUp, tone: 'brand' as const },
          { label: 'Leave Days Used', value: `${balancesData?.balances?.reduce((s, b) => s + b.used, 0) ?? 0}`, icon: CalendarDays, tone: 'info' as const },
          { label: 'Pending Requests', value: String(pendingLeaveCount), icon: AlertCircle, tone: 'warning' as const },
          { label: 'Payslips Available', value: String(payslipsData?.payslips?.length ?? 0), icon: Receipt, tone: 'cta' as const },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col gap-2 px-4 py-4">
              <span className={cn(
                'grid h-8 w-8 place-items-center rounded-lg text-sm',
                stat.tone === 'brand' && 'bg-brand-50 text-brand-600',
                stat.tone === 'info'  && 'bg-blue-50 text-blue-600',
                stat.tone === 'warning' && 'bg-amber-50 text-amber-600',
                stat.tone === 'cta'  && 'bg-cta-500/10 text-cta-600',
              )}>
                <stat.icon className="h-4 w-4" />
              </span>
              <p className="text-2xl font-semibold tracking-tight text-surface-900">{stat.value}</p>
              <p className="text-xs text-surface-400 leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </motion.div>
  );
}

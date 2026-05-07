import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Plus,
  Download,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Hourglass,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Heart,
  Plane,
  Stethoscope,
  Baby,
  Users2,
  AlertCircle,
  ArrowUpRight,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  Paperclip,
  MessageSquare,
  ListChecks,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';

/* ──────────────────────────────────────────────────────────────────
   Motion tokens
   ────────────────────────────────────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutStrong } },
};

/* ──────────────────────────────────────────────────────────────────
   Mock data
   ────────────────────────────────────────────────────────────────── */

type LeaveType = 'vacation' | 'sick' | 'emergency' | 'maternity' | 'paternity' | 'solo_parent' | 'sil';
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface LeaveRequest {
  id: string;
  employee: { name: string; initials: string; position: string };
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  filedAt: string;
  approver?: string;
  hasAttachment?: boolean;
}

const MOCK_REQUESTS: LeaveRequest[] = [
  { id: '1', employee: { name: 'Camille Reyes', initials: 'CR', position: 'Senior Designer' }, type: 'vacation', startDate: '2026-05-12', endDate: '2026-05-16', days: 5, reason: 'Annual family vacation in Palawan.', status: 'pending', filedAt: '2026-05-06', hasAttachment: false },
  { id: '2', employee: { name: 'Sofia Lim', initials: 'SL', position: 'HR Specialist' }, type: 'sick', startDate: '2026-05-08', endDate: '2026-05-09', days: 2, reason: 'Flu — medical certificate attached.', status: 'pending', filedAt: '2026-05-07', hasAttachment: true },
  { id: '3', employee: { name: 'Marco Villanueva', initials: 'MV', position: 'Engineering Lead' }, type: 'emergency', startDate: '2026-05-07', endDate: '2026-05-07', days: 1, reason: 'Family emergency.', status: 'approved', filedAt: '2026-05-07', approver: 'Sarah Chen' },
  { id: '4', employee: { name: 'Daniel Cruz', initials: 'DC', position: 'Account Manager' }, type: 'vacation', startDate: '2026-05-20', endDate: '2026-05-22', days: 3, reason: 'Wedding anniversary trip.', status: 'pending', filedAt: '2026-05-05', hasAttachment: false },
  { id: '5', employee: { name: 'Ana Bautista', initials: 'AB', position: 'Recruiter' }, type: 'maternity', startDate: '2026-06-01', endDate: '2026-08-29', days: 90, reason: 'Maternity leave — Philippine Labor Code.', status: 'approved', filedAt: '2026-04-22', approver: 'Sarah Chen', hasAttachment: true },
  { id: '6', employee: { name: 'Joaquin Garcia', initials: 'JG', position: 'Field Engineer' }, type: 'sick', startDate: '2026-05-04', endDate: '2026-05-05', days: 2, reason: 'Migraine — recovered.', status: 'approved', filedAt: '2026-05-03', approver: 'Marco Villanueva' },
  { id: '7', employee: { name: 'Lara Mendoza', initials: 'LM', position: 'Marketing Lead' }, type: 'sil', startDate: '2026-05-15', endDate: '2026-05-15', days: 1, reason: 'Service incentive leave.', status: 'rejected', filedAt: '2026-05-04' },
  { id: '8', employee: { name: 'Paolo Santos', initials: 'PS', position: 'Backend Engineer' }, type: 'paternity', startDate: '2026-05-25', endDate: '2026-05-31', days: 7, reason: 'Paternity leave — newborn baby.', status: 'pending', filedAt: '2026-05-06', hasAttachment: true },
];

const MY_BALANCES = [
  { type: 'vacation' as LeaveType, label: 'Vacation', total: 15, used: 5, pending: 2 },
  { type: 'sick' as LeaveType, label: 'Sick', total: 15, used: 3, pending: 0 },
  { type: 'emergency' as LeaveType, label: 'Emergency', total: 5, used: 1, pending: 0 },
  { type: 'sil' as LeaveType, label: 'Service Incentive', total: 5, used: 0, pending: 0 },
];

const RECENT_ACTIVITY = [
  { id: 'a1', actor: 'Sarah Chen', action: 'approved', target: "Camille's vacation request", time: '12 min ago', tone: 'cta' as const },
  { id: 'a2', actor: 'You', action: 'filed', target: '2-day sick leave', time: '1 hour ago', tone: 'brand' as const },
  { id: 'a3', actor: 'System', action: 'accrued', target: '+1.25 VL credits for May', time: '2 days ago', tone: 'info' as const },
  { id: 'a4', actor: 'Marco V.', action: 'approved', target: "Joaquin's sick leave", time: '3 days ago', tone: 'cta' as const },
];

/* ──────────────────────────────────────────────────────────────────
   Type styling — single source of truth
   ────────────────────────────────────────────────────────────────── */

const TYPE_CFG: Record<
  LeaveType,
  { label: string; short: string; icon: typeof Heart; tone: string; ring: string; dot: string; bar: string }
> = {
  vacation:    { label: 'Vacation Leave',     short: 'VL',  icon: Plane,       tone: 'bg-brand-50 text-brand-700',  ring: 'ring-brand-100',  dot: 'bg-brand-500',  bar: 'bg-brand-500' },
  sick:        { label: 'Sick Leave',          short: 'SL',  icon: Stethoscope, tone: 'bg-red-50 text-red-700',      ring: 'ring-red-200',    dot: 'bg-red-500',    bar: 'bg-red-500' },
  emergency:   { label: 'Emergency Leave',     short: 'EL',  icon: AlertCircle, tone: 'bg-amber-50 text-amber-700',  ring: 'ring-amber-200',  dot: 'bg-amber-500',  bar: 'bg-amber-500' },
  maternity:   { label: 'Maternity Leave',     short: 'MAT', icon: Baby,        tone: 'bg-pink-50 text-pink-700',    ring: 'ring-pink-200',   dot: 'bg-pink-500',   bar: 'bg-pink-500' },
  paternity:   { label: 'Paternity Leave',     short: 'PAT', icon: Heart,       tone: 'bg-indigo-50 text-indigo-700',ring: 'ring-indigo-200', dot: 'bg-indigo-500', bar: 'bg-indigo-500' },
  solo_parent: { label: 'Solo Parent Leave',   short: 'SP',  icon: Users2,      tone: 'bg-purple-50 text-purple-700',ring: 'ring-purple-200', dot: 'bg-purple-500', bar: 'bg-purple-500' },
  sil:         { label: 'Service Incentive',   short: 'SIL', icon: Sparkles,    tone: 'bg-cta-500/10 text-cta-700',  ring: 'ring-cta-500/20', dot: 'bg-cta-500',    bar: 'bg-cta-500' },
};

const STATUS_CFG: Record<LeaveStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  pending:   { label: 'Pending',   variant: 'warning' },
  approved:  { label: 'Approved',  variant: 'success' },
  rejected:  { label: 'Rejected',  variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

/* ──────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */

type TabKey = 'overview' | 'requests' | 'calendar' | 'approvals';

const TABS: { key: TabKey; label: string; icon: typeof TrendingUp; count?: number }[] = [
  { key: 'overview',  label: 'Overview',  icon: TrendingUp },
  { key: 'requests',  label: 'My Requests', icon: ListChecks, count: 3 },
  { key: 'calendar',  label: 'Team Calendar', icon: CalendarRange },
  { key: 'approvals', label: 'Approvals', icon: FileCheck2, count: 4 },
];

export function LeavesPage() {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canApprove = hasPermission('leaves.requests.approve');
  const canExport = hasPermission('leaves.requests.export') || hasPermission('hr.employees.export');

  const [tab, setTab] = useState<TabKey>('overview');

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* ───────── Header ───────── */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-surface-500">
            {dayjs().format('dddd, MMMM D, YYYY')} · Asia/Manila
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-surface-900 sm:text-3xl">
            Leave Management
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            File leaves, track balances, and manage team-wide approvals from one place.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canExport ? (
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          ) : null}
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
            File leave
          </Button>
        </div>
      </motion.div>

      {/* ───────── Hero strip: Balance hero + KPIs ───────── */}
      <motion.section variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <BalanceHeroCard userName={user?.first_name ?? 'there'} />
        <KpiStack canApprove={canApprove} />
      </motion.section>

      {/* ───────── Tabs ───────── */}
      <motion.nav
        variants={itemVariants}
        className="flex items-center gap-1 overflow-x-auto rounded-xl border border-surface-200 bg-surface-0 p-1"
        role="tablist"
      >
        {TABS.map(({ key, label, icon: Icon, count }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={cn(
                'group relative inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap',
                'cursor-pointer transition-colors duration-200',
                active ? 'text-surface-900' : 'text-surface-500 hover:text-surface-900',
              )}
            >
              {active ? (
                <motion.span
                  layoutId="leaves-tab-bg"
                  className="absolute inset-0 rounded-lg bg-brand-50 ring-1 ring-inset ring-brand-100"
                  transition={{ duration: 0.25, ease: easeOutStrong }}
                />
              ) : null}
              <Icon className={cn('relative h-4 w-4', active ? 'text-brand-700' : 'text-surface-400')} />
              <span className="relative">{label}</span>
              {count ? (
                <span
                  className={cn(
                    'relative grid h-4 min-w-[16px] place-items-center rounded-full px-1 text-[10px] font-semibold',
                    active ? 'bg-brand-600 text-white' : 'bg-surface-200 text-surface-700',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </motion.nav>

      {/* ───────── Tab panels ───────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: easeOutStrong }}
        >
          {tab === 'overview' && <OverviewTab />}
          {tab === 'requests' && <RequestsTab />}
          {tab === 'calendar' && <CalendarTab />}
          {tab === 'approvals' && <ApprovalsTab canApprove={canApprove} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Hero — Balance overview with summed remaining days
   ────────────────────────────────────────────────────────────────── */

function BalanceHeroCard({ userName }: { userName: string }) {
  const totalAllowed = MY_BALANCES.reduce((s, b) => s + b.total, 0);
  const totalUsed = MY_BALANCES.reduce((s, b) => s + b.used, 0);
  const totalPending = MY_BALANCES.reduce((s, b) => s + b.pending, 0);
  const totalAvailable = totalAllowed - totalUsed - totalPending;

  return (
    <Card className="lg:col-span-7 overflow-hidden border-brand-100/60 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white shadow-[var(--shadow-3)]">
      <div className="relative">
        {/* Decorative background — radial glow + grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 0%, rgba(34,211,238,0.40) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(34,197,94,0.20) 0%, transparent 50%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden
        />

        <CardContent className="relative grid grid-cols-1 gap-6 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-brand-100/90">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="uppercase tracking-[0.12em]">Hi {userName} · Your leave summary</span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight tabular-nums text-white sm:text-6xl">
                  {totalAvailable}
                </span>
                <span className="text-base font-medium text-brand-100/80">
                  / {totalAllowed} days available
                </span>
              </div>
              <p className="mt-1 text-sm text-brand-100/80">
                {totalUsed} used · {totalPending} pending · resets Dec 31
              </p>
            </div>

            <Button
              variant="cta"
              leftIcon={<Plus className="h-4 w-4" />}
              className="bg-cta-500 hover:bg-cta-600 text-white shadow-[0_8px_24px_-6px_rgba(34,197,94,0.55)]"
            >
              File leave
            </Button>
          </div>

          {/* Balance pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MY_BALANCES.map((b) => {
              const c = TYPE_CFG[b.type];
              const Icon = c.icon;
              const remaining = b.total - b.used - b.pending;
              const pct = b.total === 0 ? 0 : Math.round(((b.used + b.pending) / b.total) * 100);
              return (
                <div
                  key={b.type}
                  className="group relative overflow-hidden rounded-xl bg-white/[0.06] p-3.5 ring-1 ring-inset ring-white/10 transition-colors duration-200 hover:bg-white/[0.10]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/15">
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-100/90">
                        {b.label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold tabular-nums text-white">{remaining}</span>
                    <span className="text-xs text-brand-100/70">/ {b.total} days</span>
                  </div>
                  {/* mini-progress */}
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: easeOutStrong }}
                      className="h-full rounded-full bg-gradient-to-r from-brand-300 to-cta-400"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-brand-100/70">
                    {b.used} used{b.pending ? ` · ${b.pending} pending` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>

        {/* Footer rail */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.04] px-6 py-3 text-xs text-brand-100/80 sm:px-8">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-cta-400" />
            Last filed: 2-day SL · approved
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Next holiday: Eid al-Fitr · May 8
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            +1.25 VL accrued this month
          </span>
        </div>
      </div>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   KPI Stack
   ────────────────────────────────────────────────────────────────── */

function KpiStack({ canApprove }: { canApprove: boolean }) {
  const kpis = [
    {
      label: 'Pending approvals',
      value: canApprove ? '4' : '2',
      delta: canApprove ? '2 due today' : 'Awaiting your manager',
      trend: 'flat' as const,
      icon: Hourglass,
      tone: 'warning' as const,
    },
    {
      label: 'On leave today',
      value: '6',
      delta: '+2 vs yesterday',
      trend: 'up' as const,
      icon: Users2,
      tone: 'brand' as const,
    },
    {
      label: 'Approved this month',
      value: '23',
      delta: '94% approval rate',
      trend: 'up' as const,
      icon: CheckCircle2,
      tone: 'cta' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1">
      {kpis.map((k) => (
        <KpiCard key={k.label} {...k} />
      ))}
    </div>
  );
}

const TONE: Record<'brand' | 'cta' | 'warning', { iconBg: string; deltaText: string; ring: string }> = {
  brand:   { iconBg: 'bg-brand-50 text-brand-700',   deltaText: 'text-brand-700',   ring: 'ring-brand-100' },
  cta:     { iconBg: 'bg-cta-500/10 text-cta-700',   deltaText: 'text-cta-700',     ring: 'ring-cta-500/20' },
  warning: { iconBg: 'bg-amber-50 text-amber-700',    deltaText: 'text-amber-700',   ring: 'ring-amber-200' },
};

function KpiCard({
  label,
  value,
  delta,
  trend,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  icon: typeof Users2;
  tone: 'brand' | 'cta' | 'warning';
}) {
  const t = TONE[tone];
  return (
    <Card className="group overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-surface-900">{value}</p>
          <p className={cn('mt-1 inline-flex items-center gap-1 text-xs font-medium', t.deltaText)}>
            <ArrowUpRight
              className={cn(
                'h-3 w-3',
                trend === 'down' && 'rotate-90',
                trend === 'flat' && 'rotate-45 opacity-60',
              )}
            />
            {delta}
          </p>
        </div>
        <span
          className={cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition-colors duration-200',
            t.iconBg,
            t.ring,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Overview
   ────────────────────────────────────────────────────────────────── */

function OverviewTab() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <YearlyUtilizationCard />
      <UpcomingMyLeavesCard />
      <RecentActivityCard />
      <PolicyHighlightsCard />
    </div>
  );
}

function YearlyUtilizationCard() {
  // Per-month leave usage (mock)
  const months = [
    { m: 'Jan', vl: 1, sl: 0 },
    { m: 'Feb', vl: 0, sl: 1 },
    { m: 'Mar', vl: 2, sl: 0 },
    { m: 'Apr', vl: 0, sl: 2 },
    { m: 'May', vl: 2, sl: 0, current: true },
    { m: 'Jun', vl: 0, sl: 0 },
    { m: 'Jul', vl: 0, sl: 0 },
    { m: 'Aug', vl: 0, sl: 0 },
    { m: 'Sep', vl: 0, sl: 0 },
    { m: 'Oct', vl: 0, sl: 0 },
    { m: 'Nov', vl: 0, sl: 0 },
    { m: 'Dec', vl: 0, sl: 0 },
  ];
  const max = 4;
  const totalVL = months.reduce((s, m) => s + m.vl, 0);
  const totalSL = months.reduce((s, m) => s + m.sl, 0);

  return (
    <Card className="lg:col-span-8 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Leave utilization</h3>
            <p className="text-xs text-surface-500">Days taken per month · 2026</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tracking-tight tabular-nums text-surface-900">
              {totalVL + totalSL}
              <span className="text-base font-medium text-surface-400"> / 40 days</span>
            </p>
            <p className="mt-0.5 text-xs text-surface-500">
              <span className="font-medium text-cta-700">{Math.round(((totalVL + totalSL) / 40) * 100)}%</span> of yearly allowance
            </p>
          </div>
        </div>

        {/* Progress rail */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, ((totalVL + totalSL) / 40) * 100)}%` }}
            transition={{ duration: 0.6, ease: easeOutStrong }}
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cta-500"
          />
        </div>

        {/* Month columns */}
        <div className="mt-8 grid grid-cols-6 gap-3 sm:grid-cols-12">
          {months.map((d, idx) => {
            const vlH = (d.vl / max) * 100;
            const slH = (d.sl / max) * 100;
            const future = idx > 4;
            return (
              <div key={d.m} className="flex flex-col items-center gap-2">
                <div className="relative flex h-32 w-full items-end justify-center">
                  <div className="absolute inset-x-2 top-0 bottom-0 rounded-md bg-surface-50 ring-1 ring-inset ring-surface-100" />
                  <div className="relative flex h-full w-full max-w-[28px] flex-col justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${slH}%` }}
                      transition={{ duration: 0.5, delay: 0.1 + idx * 0.03, ease: easeOutStrong }}
                      className={cn(
                        'rounded-t-md',
                        future ? 'bg-surface-200' : 'bg-red-400',
                      )}
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${vlH}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.03, ease: easeOutStrong }}
                      className={cn(
                        slH > 0 ? '' : 'rounded-t-md',
                        future
                          ? 'bg-surface-100'
                          : d.current
                            ? 'bg-gradient-to-t from-brand-700 to-brand-500'
                            : 'bg-brand-300',
                      )}
                    />
                  </div>
                  {d.current ? (
                    <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-600 ring-2 ring-brand-100" />
                  ) : null}
                </div>
                <span className={cn('text-[10px] font-semibold', d.current ? 'text-brand-700' : 'text-surface-500')}>
                  {d.m}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-surface-100 pt-4 text-xs">
          <LegendDot className="bg-brand-500" label="Vacation" value={`${totalVL}d taken`} />
          <LegendDot className="bg-red-400" label="Sick" value={`${totalSL}d taken`} />
          <LegendDot className="bg-surface-200" label="Upcoming" value={`${40 - totalVL - totalSL}d remaining`} />
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ className, label, value }: { className: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-surface-600">
      <span className={cn('h-2.5 w-2.5 rounded-full', className)} />
      <span className="font-medium text-surface-700">{label}</span>
      <span className="tabular-nums text-surface-500">· {value}</span>
    </span>
  );
}

function UpcomingMyLeavesCard() {
  const items = [
    { id: '1', type: 'sick' as LeaveType, dates: 'May 8 — May 9', days: 2, status: 'pending' as LeaveStatus },
    { id: '2', type: 'vacation' as LeaveType, dates: 'May 12 — May 16', days: 5, status: 'pending' as LeaveStatus },
  ];

  return (
    <Card className="lg:col-span-4">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Your upcoming</h3>
            <p className="text-xs text-surface-500">Approved & pending</p>
          </div>
          <Badge variant="brand">{items.length}</Badge>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 grid place-items-center gap-2 rounded-xl border border-dashed border-surface-200 bg-surface-50 p-8 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-100 text-surface-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-surface-900">No upcoming leaves</p>
            <p className="text-xs text-surface-500">File one when you need a break.</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {items.map((it) => {
              const c = TYPE_CFG[it.type];
              const Icon = c.icon;
              return (
                <li
                  key={it.id}
                  className="group flex items-center gap-3 rounded-xl border border-surface-200 p-3 transition-colors duration-200 hover:border-brand-200 hover:bg-brand-50/50 cursor-pointer"
                >
                  <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset', c.tone, c.ring)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-surface-500">{c.label}</p>
                    <p className="truncate text-sm font-medium text-surface-900">
                      {it.dates} · {it.days}d
                    </p>
                  </div>
                  <Badge variant={STATUS_CFG[it.status].variant}>{STATUS_CFG[it.status].label}</Badge>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          className="mt-4 inline-flex w-full items-center justify-between gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs font-medium text-surface-700 hover:bg-surface-100 cursor-pointer transition-colors duration-200"
        >
          <span>View full history</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}

function RecentActivityCard() {
  return (
    <Card className="lg:col-span-7">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Recent activity</h3>
            <p className="text-xs text-surface-500">Across your team</p>
          </div>
          <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
            View all
          </Button>
        </div>

        <ul className="mt-5 space-y-3">
          {RECENT_ACTIVITY.map((a, i) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04, ease: easeOutStrong }}
              className="flex items-start gap-3 rounded-xl border border-surface-100 p-3 transition-colors duration-200 hover:bg-surface-50"
            >
              <span
                className={cn(
                  'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 ring-inset',
                  a.tone === 'cta' && 'bg-cta-500/10 text-cta-700 ring-cta-500/20',
                  a.tone === 'brand' && 'bg-brand-50 text-brand-700 ring-brand-100',
                  a.tone === 'info' && 'bg-blue-50 text-blue-700 ring-blue-200',
                )}
              >
                {a.tone === 'cta' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : a.tone === 'info' ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <ClipboardList className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-surface-900">
                  <span className="font-semibold">{a.actor}</span>{' '}
                  <span className="text-surface-500">{a.action}</span>{' '}
                  <span className="font-medium">{a.target}</span>
                </p>
                <p className="mt-0.5 text-xs text-surface-400">{a.time}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PolicyHighlightsCard() {
  const items = [
    { title: 'PH Maternity Leave', detail: '105 days paid · solo parents +15 days', icon: Baby, tone: 'pink' },
    { title: 'Vacation Carry-over', detail: 'Up to 5 days roll into next year', icon: Plane, tone: 'brand' },
    { title: 'Sick Leave > 2 days', detail: 'Medical certificate required', icon: Stethoscope, tone: 'red' },
  ];

  return (
    <Card className="lg:col-span-5 border-brand-200 bg-gradient-to-br from-brand-50/40 to-surface-0">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Policy highlights</h3>
            <p className="text-xs text-surface-500">Quick reminders for your team</p>
          </div>
          <Badge variant="brand">PH compliant</Badge>
        </div>

        <ul className="mt-5 space-y-2">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <li
                key={it.title}
                className="group flex items-start gap-3 rounded-xl bg-surface-0/80 p-3 ring-1 ring-inset ring-surface-200 transition-colors duration-200 hover:ring-brand-200 hover:bg-surface-0"
              >
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset',
                    it.tone === 'pink' && 'bg-pink-50 text-pink-700 ring-pink-200',
                    it.tone === 'brand' && 'bg-brand-50 text-brand-700 ring-brand-100',
                    it.tone === 'red' && 'bg-red-50 text-red-700 ring-red-200',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900">{it.title}</p>
                  <p className="text-xs text-surface-500">{it.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Requests
   ────────────────────────────────────────────────────────────────── */

function RequestsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<LeaveType | 'all'>('all');

  const filtered = MOCK_REQUESTS.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (typeFilter !== 'all' && l.type !== typeFilter) return false;
    if (search && !l.employee.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="search"
            placeholder="Search by employee name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-surface-200 bg-surface-0 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeaveStatus | 'all')}
          className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as LeaveType | 'all')}
          className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          <option value="all">All types</option>
          <option value="vacation">Vacation</option>
          <option value="sick">Sick</option>
          <option value="emergency">Emergency</option>
          <option value="maternity">Maternity</option>
          <option value="paternity">Paternity</option>
          <option value="solo_parent">Solo Parent</option>
          <option value="sil">Service Incentive</option>
        </select>

        <Button variant="secondary" size="md" leftIcon={<Filter className="h-4 w-4" />}>
          More filters
        </Button>
        <div className="ml-auto text-xs text-surface-500">
          Showing <span className="font-medium text-surface-900 tabular-nums">{filtered.length}</span> of{' '}
          <span className="tabular-nums">{MOCK_REQUESTS.length}</span> requests
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/60">
                {['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Status', 'Filed', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-surface-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-100 text-surface-400">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-surface-900">No matching requests</p>
                      <p className="text-xs text-surface-500">Try a different search or filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => <RequestRow key={r.id} request={r} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-surface-100 px-4 py-3 text-xs text-surface-500">
          <span>Last refreshed {dayjs().format('h:mm A')}</span>
          <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
            View archive
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RequestRow({ request }: { request: LeaveRequest }) {
  const c = TYPE_CFG[request.type];
  const Icon = c.icon;
  return (
    <tr className="border-b border-surface-50 transition-colors duration-200 last:border-0 hover:bg-surface-50">
      {/* Employee */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {request.employee.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-surface-900">{request.employee.name}</p>
            <p className="text-xs text-surface-500">{request.employee.position}</p>
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
            c.tone,
            c.ring,
          )}
        >
          <Icon className="h-3 w-3" />
          {c.short}
        </span>
      </td>

      {/* Dates */}
      <td className="px-4 py-3">
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium tabular-nums text-surface-900">
            {dayjs(request.startDate).format('MMM D')}
            {request.startDate !== request.endDate ? ` — ${dayjs(request.endDate).format('MMM D')}` : ''}
          </span>
          <span className="text-[11px] text-surface-400">{dayjs(request.startDate).format('YYYY')}</span>
        </div>
      </td>

      {/* Days */}
      <td className="px-4 py-3">
        <span className="text-sm font-semibold tabular-nums text-surface-900">
          {request.days}
          <span className="ml-0.5 text-xs font-normal text-surface-400">d</span>
        </span>
      </td>

      {/* Reason */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <p className="max-w-[260px] truncate text-sm text-surface-600">{request.reason}</p>
          {request.hasAttachment ? (
            <Paperclip className="h-3 w-3 shrink-0 text-surface-400" aria-label="Has attachment" />
          ) : null}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge variant={STATUS_CFG[request.status].variant}>{STATUS_CFG[request.status].label}</Badge>
      </td>

      {/* Filed */}
      <td className="px-4 py-3">
        <span className="text-xs text-surface-500 tabular-nums">{dayjs(request.filedAt).format('MMM D')}</span>
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-900"
          aria-label={`Open request for ${request.employee.name}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Calendar
   ────────────────────────────────────────────────────────────────── */

function CalendarTab() {
  const [cursor, setCursor] = useState(() => dayjs('2026-05-01'));

  const monthData = useMemo(() => {
    const startOfMonth = cursor.startOf('month');
    const startOfGrid = startOfMonth.startOf('week'); // dayjs default: Sunday
    const cells: { date: dayjs.Dayjs; inMonth: boolean; events: { type: LeaveType; initials: string; name: string }[] }[] = [];

    for (let i = 0; i < 42; i++) {
      const date = startOfGrid.add(i, 'day');
      const inMonth = date.month() === cursor.month();
      const events = MOCK_REQUESTS
        .filter((r) => r.status !== 'rejected' && r.status !== 'cancelled')
        .filter((r) => date.isSame(r.startDate, 'day') || date.isSame(r.endDate, 'day') || (date.isAfter(r.startDate) && date.isBefore(r.endDate)))
        .map((r) => ({ type: r.type, initials: r.employee.initials, name: r.employee.name }));
      cells.push({ date, inMonth, events });
    }
    return cells;
  }, [cursor]);

  const today = dayjs();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-9 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-surface-900">Team calendar</h3>
              <p className="text-xs text-surface-500">{cursor.format('MMMM YYYY')} · approved & pending leaves</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCursor((c) => c.subtract(1, 'month'))}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-surface-200 bg-surface-0 text-surface-600 transition-colors duration-200 hover:bg-surface-50 hover:text-surface-900"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Button variant="secondary" size="sm" onClick={() => setCursor(dayjs('2026-05-01'))}>
                Today
              </Button>
              <button
                type="button"
                onClick={() => setCursor((c) => c.add(1, 'month'))}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-surface-200 bg-surface-0 text-surface-600 transition-colors duration-200 hover:bg-surface-50 hover:text-surface-900"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="mt-5 grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase tracking-wide text-surface-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="px-2 py-1 text-center">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <motion.div
            key={cursor.format('YYYY-MM')}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: easeOutStrong }}
            className="mt-2 grid grid-cols-7 gap-2"
          >
            {monthData.map((cell, i) => {
              const isToday = cell.date.isSame(today, 'day');
              const isWeekend = cell.date.day() === 0 || cell.date.day() === 6;
              return (
                <div
                  key={i}
                  className={cn(
                    'relative flex min-h-[88px] flex-col gap-1 rounded-xl border p-2 transition-colors duration-200',
                    !cell.inMonth && 'border-surface-100 bg-surface-50/40 text-surface-300',
                    cell.inMonth && !isToday && 'border-surface-200 bg-surface-0 hover:bg-surface-50',
                    isToday && 'border-brand-300 bg-brand-50/60 shadow-[0_0_0_1px_var(--color-brand-200)]',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-semibold tabular-nums',
                        isToday ? 'text-brand-700' : cell.inMonth ? (isWeekend ? 'text-surface-400' : 'text-surface-700') : 'text-surface-300',
                      )}
                    >
                      {cell.date.date()}
                    </span>
                    {isToday ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1">
                    {cell.events.slice(0, 2).map((e, idx) => {
                      const c = TYPE_CFG[e.type];
                      return (
                        <span
                          key={idx}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset truncate',
                            c.tone,
                            c.ring,
                          )}
                          title={`${e.name} · ${c.label}`}
                        >
                          <span className={cn('h-1 w-1 shrink-0 rounded-full', c.dot)} />
                          <span className="truncate">{e.initials}</span>
                        </span>
                      );
                    })}
                    {cell.events.length > 2 ? (
                      <span className="text-[10px] font-medium text-surface-500">+{cell.events.length - 2} more</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-surface-100 pt-4 text-xs text-surface-600">
            {(['vacation', 'sick', 'emergency', 'maternity', 'paternity', 'sil'] as LeaveType[]).map((t) => {
              const c = TYPE_CFG[t];
              return (
                <span key={t} className="inline-flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', c.dot)} />
                  <span className="text-surface-700">{c.label}</span>
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sidebar — On leave today */}
      <div className="flex flex-col gap-4 lg:col-span-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-surface-900">On leave today</h3>
                <p className="text-xs text-surface-500">{today.format('MMMM D')}</p>
              </div>
              <Badge variant="warning">3</Badge>
            </div>

            <ul className="mt-4 space-y-2.5">
              {[
                { name: 'Marco Villanueva', initials: 'MV', type: 'emergency' as LeaveType },
                { name: 'Ana Bautista', initials: 'AB', type: 'maternity' as LeaveType },
                { name: 'Joaquin Garcia', initials: 'JG', type: 'sick' as LeaveType },
              ].map((p) => {
                const c = TYPE_CFG[p.type];
                const Icon = c.icon;
                return (
                  <li
                    key={p.initials}
                    className="flex items-center gap-3 rounded-lg border border-surface-200 p-2.5 transition-colors duration-200 hover:bg-surface-50"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
                      {p.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-surface-900">{p.name}</p>
                      <p className="flex items-center gap-1 text-[10px] text-surface-500">
                        <Icon className="h-2.5 w-2.5" />
                        {c.label}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Public holidays</h3>
            <p className="text-xs text-surface-500">Manila, Philippines</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <HolidayRow date="May 8" label="Eid al-Fitr" tag="Regular" tone="amber" />
              <HolidayRow date="Jun 12" label="Independence Day" tag="Regular" tone="brand" />
              <HolidayRow date="Aug 21" label="Ninoy Aquino Day" tag="Special" tone="default" />
              <HolidayRow date="Aug 25" label="National Heroes Day" tag="Regular" tone="brand" />
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HolidayRow({ date, label, tag, tone }: { date: string; label: string; tag: string; tone: 'amber' | 'brand' | 'default' }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-semibold ring-1 ring-inset',
            tone === 'amber' && 'bg-amber-50 text-amber-700 ring-amber-200',
            tone === 'brand' && 'bg-brand-50 text-brand-700 ring-brand-100',
            tone === 'default' && 'bg-surface-100 text-surface-700 ring-surface-200',
          )}
        >
          {date.split(' ')[1]}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-surface-900">{label}</p>
          <p className="text-[10px] text-surface-500">{date}</p>
        </div>
      </div>
      <Badge variant={tone === 'brand' ? 'brand' : tone === 'amber' ? 'warning' : 'default'}>{tag}</Badge>
    </li>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Approvals
   ────────────────────────────────────────────────────────────────── */

function ApprovalsTab({ canApprove }: { canApprove: boolean }) {
  const pending = MOCK_REQUESTS.filter((r) => r.status === 'pending');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-8 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-surface-900">Pending approvals</h3>
              <p className="text-xs text-surface-500">
                {canApprove ? 'Review and act on team leave requests' : 'Awaiting your manager — view-only'}
              </p>
            </div>
            <Badge variant="warning">{pending.length} pending</Badge>
          </div>

          <ul className="divide-y divide-surface-100">
            {pending.map((r, i) => (
              <ApprovalItem key={r.id} request={r} canApprove={canApprove} delay={i * 0.04} />
            ))}
            {pending.length === 0 ? (
              <li className="px-6 py-16">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-cta-500/10 text-cta-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-surface-900">All caught up</p>
                  <p className="text-xs text-surface-500">No pending leave requests for review.</p>
                </div>
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:col-span-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold tracking-tight text-surface-900">This month</h3>
            <p className="text-xs text-surface-500">Approval activity</p>
            <ul className="mt-5 space-y-4">
              <SummaryRow label="Submitted" value="32" tone="text-surface-900" />
              <SummaryRow label="Approved" value="23" tone="text-cta-700" />
              <SummaryRow label="Rejected" value="2" tone="text-red-600" />
              <SummaryRow label="Pending" value={String(pending.length)} tone="text-amber-700" />
            </ul>

            {/* Mini distribution bar */}
            <div className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-surface-100">
              <motion.div initial={{ width: 0 }} animate={{ width: '72%' }} transition={{ duration: 0.6, ease: easeOutStrong }} className="bg-cta-500" />
              <motion.div initial={{ width: 0 }} animate={{ width: '13%' }} transition={{ duration: 0.6, delay: 0.05, ease: easeOutStrong }} className="bg-amber-400" />
              <motion.div initial={{ width: 0 }} animate={{ width: '6%' }} transition={{ duration: 0.6, delay: 0.1, ease: easeOutStrong }} className="bg-red-400" />
            </div>
            <p className="mt-2 text-[11px] text-surface-500">94% approval rate · avg response 4h 12m</p>
          </CardContent>
        </Card>

        <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-surface-0">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Need time off?</h3>
            <p className="mt-1 text-xs text-surface-600">
              File a leave request. Your manager will review and respond within 24 hours.
            </p>
            <Button className="mt-4" variant="primary" leftIcon={<Plus className="h-4 w-4" />} fullWidth>
              File leave
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ApprovalItem({ request, canApprove, delay }: { request: LeaveRequest; canApprove: boolean; delay: number }) {
  const [resolved, setResolved] = useState<null | 'approved' | 'rejected'>(null);
  const c = TYPE_CFG[request.type];
  const Icon = c.icon;

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: easeOutStrong }}
      className="group flex flex-col gap-3 px-6 py-4 transition-colors duration-200 hover:bg-surface-50 sm:flex-row sm:items-start"
    >
      <div className="flex flex-1 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {request.employee.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-surface-900">{request.employee.name}</p>
            <span className="text-xs text-surface-400">·</span>
            <p className="text-xs text-surface-500">{request.employee.position}</p>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                c.tone,
                c.ring,
              )}
            >
              <Icon className="h-2.5 w-2.5" />
              {c.short}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-surface-600">
            <span className="inline-flex items-center gap-1 tabular-nums font-medium text-surface-900">
              <CalendarDays className="h-3 w-3 text-surface-400" />
              {dayjs(request.startDate).format('MMM D')}
              {request.startDate !== request.endDate ? ` — ${dayjs(request.endDate).format('MMM D')}` : ''}
            </span>
            <span className="text-surface-400">·</span>
            <span className="font-medium tabular-nums text-surface-900">{request.days} day{request.days !== 1 ? 's' : ''}</span>
            <span className="text-surface-400">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-surface-400" />
              Filed {dayjs(request.filedAt).format('MMM D')}
            </span>
          </div>

          <p className="mt-2 flex items-start gap-1.5 text-sm text-surface-600">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
            <span>{request.reason}</span>
            {request.hasAttachment ? (
              <span className="ml-1 inline-flex items-center gap-1 text-xs text-brand-700">
                <Paperclip className="h-3 w-3" />
                Attachment
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:self-center">
        <AnimatePresence mode="wait">
          {resolved ? (
            <motion.span
              key="resolved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: easeOutStrong }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-inset',
                resolved === 'approved'
                  ? 'bg-cta-500/10 text-cta-700 ring-cta-500/20'
                  : 'bg-red-50 text-red-700 ring-red-200',
              )}
            >
              {resolved === 'approved' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {resolved === 'approved' ? 'Approved' : 'Rejected'}
            </motion.span>
          ) : canApprove ? (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResolved('rejected')}
                leftIcon={<XCircle className="h-3.5 w-3.5" />}
              >
                Decline
              </Button>
              <Button
                variant="cta"
                size="sm"
                onClick={() => setResolved('approved')}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                Approve
              </Button>
            </motion.div>
          ) : (
            <Badge variant="warning">Awaiting approval</Badge>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-sm text-surface-600">{label}</span>
      <span className={cn('text-lg font-semibold tabular-nums', tone)}>{value}</span>
    </li>
  );
}

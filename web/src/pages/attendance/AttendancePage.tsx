import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Play,
  Square,
  Coffee,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Users2,
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpRight,
  Sun,
  Moon,
  Sunrise,
  ChevronRight,
  Timer,
  ListChecks,
  CalendarRange,
  FileEdit,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import {
  useAdminAttendance,
  useAdminCorrections,
  useApproveCorrection,
  useRejectCorrection,
} from '@/hooks/useAdminAttendance';
import type { AttendanceLog } from '@/types';

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
   Static week bar-chart scaffold (rendered with real hours when available)
   ────────────────────────────────────────────────────────────────── */

const WEEK_DATA = [
  { day: 'Mon', date: 'May 4', regular: 7.8, overtime: 0.4 },
  { day: 'Tue', date: 'May 5', regular: 8.0, overtime: 0.0 },
  { day: 'Wed', date: 'May 6', regular: 8.2, overtime: 1.1 },
  { day: 'Thu', date: 'May 7', regular: 4.6, overtime: 0.0, today: true },
  { day: 'Fri', date: 'May 8', regular: 0, overtime: 0, future: true },
  { day: 'Sat', date: 'May 9', regular: 0, overtime: 0, future: true, weekend: true },
  { day: 'Sun', date: 'May 10', regular: 0, overtime: 0, future: true, weekend: true },
];

const SCHEDULE_TODAY = {
  shift: 'Day Shift',
  start: '09:00',
  end: '18:00',
  break: '60 min',
  location: 'BGC HQ — Tower 3',
};

/* ──────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */

type TabKey = 'overview' | 'logs' | 'schedule' | 'corrections';

const TABS: { key: TabKey; label: string; icon: typeof Clock; count?: number }[] = [
  { key: 'overview', label: 'Overview', icon: TrendingUp },
  { key: 'logs', label: 'Daily Logs', icon: ListChecks },
  { key: 'schedule', label: 'Schedule', icon: CalendarRange },
  { key: 'corrections', label: 'Corrections', icon: FileEdit, count: undefined },
];

export function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCorrect = hasPermission('attendance.corrections.create');
  const canExport = hasPermission('attendance.logs.export') || hasPermission('hr.employees.export');

  const [tab, setTab] = useState<TabKey>('overview');
  const { data: correctionsData } = useAdminCorrections({ status: 'pending', per_page: 100 });
  const pendingCount = correctionsData?.corrections?.length ?? 0;

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
            Time &amp; Attendance
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            Clock in, manage shifts, and review daily attendance for your team.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canExport ? (
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          ) : null}
          {canCorrect ? (
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
              File correction
            </Button>
          ) : null}
        </div>
      </motion.div>

      {/* ───────── Hero strip: Clock + KPIs ───────── */}
      <motion.section variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ClockInCard userName={user?.first_name ?? 'there'} />
        <KpiStack />
      </motion.section>

      {/* ───────── Tabs ───────── */}
      <motion.nav
        variants={itemVariants}
        className="flex items-center gap-1 overflow-x-auto rounded-xl border border-surface-200 bg-surface-0 p-1"
        role="tablist"
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          const count = key === 'corrections' ? (pendingCount > 0 ? pendingCount : undefined) : undefined;
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
                  layoutId="attendance-tab-bg"
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
          {tab === 'logs' && <LogsTab />}
          {tab === 'schedule' && <ScheduleTab />}
          {tab === 'corrections' && <CorrectionsTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Hero — Live clock-in card
   ────────────────────────────────────────────────────────────────── */

type ClockState = 'out' | 'in' | 'break';

function ClockInCard({ userName }: { userName: string }) {
  const [now, setNow] = useState(() => new Date());
  const [state, setState] = useState<ClockState>('in');
  const [clockedAt] = useState(() => dayjs().subtract(4, 'hour').subtract(36, 'minute'));

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = useMemo(() => {
    if (state === 'out') return null;
    const diffMin = Math.max(0, dayjs(now).diff(clockedAt, 'minute'));
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return { h, m };
  }, [state, clockedAt, now]);

  const period = useMemo(() => {
    const hr = now.getHours();
    if (hr < 12) return { label: 'morning', icon: Sunrise };
    if (hr < 18) return { label: 'afternoon', icon: Sun };
    return { label: 'evening', icon: Moon };
  }, [now]);

  const PeriodIcon = period.icon;

  return (
    <Card className="lg:col-span-7 overflow-hidden border-brand-100/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white shadow-[var(--shadow-3)]">
      <div className="relative">
        {/* Decorative background — subtle radial glow + grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 0%, rgba(34,211,238,0.35) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(34,197,94,0.18) 0%, transparent 50%)',
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

        <CardContent className="relative grid grid-cols-1 gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
          {/* Left: greeting + status + clock */}
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex items-center gap-2 text-xs font-medium text-brand-100/90">
              <PeriodIcon className="h-3.5 w-3.5" />
              <span className="uppercase tracking-[0.12em]">Good {period.label}, {userName}</span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight tabular-nums text-white sm:text-6xl">
                  {dayjs(now).format('HH:mm')}
                </span>
                <span className="text-2xl font-medium tabular-nums text-brand-100/80 sm:text-3xl">
                  :{dayjs(now).format('ss')}
                </span>
              </div>
              <p className="mt-1 text-sm text-brand-100/80">
                {dayjs(now).format('dddd, MMMM D')} · {dayjs(now).format('z') || 'PHT'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill state={state} />
              {state !== 'out' && elapsed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/15">
                  <Timer className="h-3 w-3" />
                  <span className="tabular-nums">
                    {elapsed.h}h {String(elapsed.m).padStart(2, '0')}m
                  </span>
                  <span className="text-brand-100/80">today</span>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/15">
                <MapPin className="h-3 w-3" />
                BGC HQ — Tower 3
              </span>
            </div>
          </div>

          {/* Right: punch buttons */}
          <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-stretch">
            <PunchButton
              primary={state === 'out'}
              icon={state === 'out' ? Play : Square}
              label={state === 'out' ? 'Clock In' : 'Clock Out'}
              onClick={() => setState((s) => (s === 'out' ? 'in' : 'out'))}
            />
            <PunchButton
              ghost
              disabled={state === 'out'}
              icon={Coffee}
              label={state === 'break' ? 'End Break' : 'Break'}
              onClick={() =>
                setState((s) => (s === 'break' ? 'in' : s === 'in' ? 'break' : s))
              }
            />
          </div>
        </CardContent>

        {/* Footer rail */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.04] px-6 py-3 text-xs text-brand-100/80 sm:px-8">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-cta-500" />
            Clocked in {clockedAt.format('h:mm A')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Day Shift · 09:00 — 18:00
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Coffee className="h-3.5 w-3.5" />
            Break taken · 42 min
          </span>
        </div>
      </div>
    </Card>
  );
}

function StatusPill({ state }: { state: ClockState }) {
  const cfg = {
    out: { label: 'Off the clock', dot: 'bg-surface-300', ring: 'ring-white/15' },
    in: { label: 'On the clock', dot: 'bg-cta-500', ring: 'ring-cta-500/40' },
    break: { label: 'On break', dot: 'bg-amber-400', ring: 'ring-amber-300/40' },
  }[state];
  return (
    <span className={cn(
      'inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset',
      cfg.ring,
    )}>
      <span className="relative flex h-2 w-2">
        <span className={cn('absolute inset-0 rounded-full opacity-75', cfg.dot, state !== 'out' && 'animate-ping')} />
        <span className={cn('relative h-2 w-2 rounded-full', cfg.dot)} />
      </span>
      {cfg.label}
    </span>
  );
}

function PunchButton({
  icon: Icon,
  label,
  onClick,
  primary,
  ghost,
  disabled,
}: {
  icon: typeof Play;
  label: string;
  onClick: () => void;
  primary?: boolean;
  ghost?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold whitespace-nowrap',
        'cursor-pointer transition-[transform,background-color,box-shadow] duration-200 ease-out-strong',
        'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700',
        primary && 'bg-cta-500 text-white shadow-[0_8px_24px_-6px_rgba(34,197,94,0.55)] hover:bg-cta-600',
        !primary && !ghost && 'bg-white text-brand-900 hover:bg-brand-50',
        ghost && 'bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15',
        disabled && 'cursor-not-allowed opacity-40 active:scale-100 hover:bg-white/10',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────
   KPI Stack
   ────────────────────────────────────────────────────────────────── */

function KpiStack() {
  const kpis = [
    {
      label: 'Present today',
      value: '142',
      delta: '+6 vs yesterday',
      trend: 'up' as const,
      icon: Users2,
      tone: 'cta' as const,
    },
    {
      label: 'Late arrivals',
      value: '8',
      delta: '−3 vs yesterday',
      trend: 'down' as const,
      icon: AlertCircle,
      tone: 'warning' as const,
    },
    {
      label: 'Pending OT approvals',
      value: '12',
      delta: '4 high priority',
      trend: 'flat' as const,
      icon: Timer,
      tone: 'brand' as const,
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
  brand: { iconBg: 'bg-brand-50 text-brand-700', deltaText: 'text-brand-700', ring: 'ring-brand-100' },
  cta: { iconBg: 'bg-cta-500/10 text-cta-700', deltaText: 'text-cta-700', ring: 'ring-cta-500/20' },
  warning: { iconBg: 'bg-amber-50 text-amber-700', deltaText: 'text-amber-700', ring: 'ring-amber-200' },
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
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowUpRight : ArrowUpRight;
  return (
    <Card className="group overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-surface-900">{value}</p>
          <p className={cn('mt-1 inline-flex items-center gap-1 text-xs font-medium', t.deltaText)}>
            <TrendIcon
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
      <WeeklyHoursCard />
      <ScheduleTodayCard />
      <DistributionCard />
      <UpcomingCard />
    </div>
  );
}

function WeeklyHoursCard() {
  const target = 40;
  const totalRegular = WEEK_DATA.reduce((s, d) => s + d.regular, 0);
  const totalOt = WEEK_DATA.reduce((s, d) => s + d.overtime, 0);
  const total = totalRegular + totalOt;
  const pct = Math.min(100, Math.round((total / target) * 100));

  const max = 10;

  return (
    <Card className="lg:col-span-8 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-surface-900">This week</h3>
            <p className="text-xs text-surface-500">Hours logged · target 40h</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tracking-tight tabular-nums text-surface-900">
              {total.toFixed(1)}
              <span className="text-base font-medium text-surface-400"> / {target}h</span>
            </p>
            <p className="mt-0.5 text-xs text-surface-500">
              <span className="font-medium text-cta-700">{pct}%</span> of weekly target
            </p>
          </div>
        </div>

        {/* Progress rail */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: easeOutStrong }}
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cta-500"
          />
        </div>

        {/* Bar chart */}
        <div className="mt-8 grid grid-cols-7 gap-3">
          {WEEK_DATA.map((d, idx) => {
            const regH = (d.regular / max) * 100;
            const otH = (d.overtime / max) * 100;
            return (
              <div key={d.day} className="flex flex-col items-center gap-2">
                <div className="relative flex h-32 w-full items-end justify-center">
                  {/* Track */}
                  <div className="absolute inset-x-3 top-0 bottom-0 rounded-md bg-surface-50 ring-1 ring-inset ring-surface-100" />
                  {/* Stack */}
                  <div className="relative flex h-full w-full max-w-[36px] flex-col justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${otH}%` }}
                      transition={{ duration: 0.5, delay: 0.1 + idx * 0.04, ease: easeOutStrong }}
                      className={cn(
                        'rounded-t-md',
                        d.future ? 'bg-surface-200' : 'bg-amber-400',
                      )}
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${regH}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.04, ease: easeOutStrong }}
                      className={cn(
                        otH > 0 ? '' : 'rounded-t-md',
                        d.future
                          ? 'bg-surface-100'
                          : d.today
                            ? 'bg-gradient-to-t from-brand-700 to-brand-500'
                            : 'bg-brand-200',
                      )}
                    />
                  </div>
                  {/* Today marker */}
                  {d.today ? (
                    <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-600 ring-2 ring-brand-100" />
                  ) : null}
                </div>
                <div className="flex flex-col items-center leading-tight">
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      d.today ? 'text-brand-700' : d.weekend ? 'text-surface-400' : 'text-surface-700',
                    )}
                  >
                    {d.day}
                  </span>
                  <span className="text-[10px] text-surface-400">{d.date}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-surface-100 pt-4 text-xs">
          <LegendDot className="bg-brand-500" label="Regular" value={`${totalRegular.toFixed(1)}h`} />
          <LegendDot className="bg-amber-400" label="Overtime" value={`${totalOt.toFixed(1)}h`} />
          <LegendDot className="bg-surface-200" label="Pending" value={`${(target - total).toFixed(1)}h remaining`} />
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

function ScheduleTodayCard() {
  const now = dayjs();
  const start = dayjs().hour(9).minute(0);
  const end = dayjs().hour(18).minute(0);
  const totalMin = end.diff(start, 'minute');
  const elapsedMin = Math.max(0, Math.min(totalMin, now.diff(start, 'minute')));
  const pct = Math.round((elapsedMin / totalMin) * 100);

  return (
    <Card className="lg:col-span-4">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Your shift today</h3>
            <p className="text-xs text-surface-500">{SCHEDULE_TODAY.shift}</p>
          </div>
          <Badge variant="brand">In progress</Badge>
        </div>

        {/* Timeline */}
        <div className="mt-6">
          <div className="flex items-end justify-between text-[11px] font-medium tabular-nums text-surface-500">
            <span>{SCHEDULE_TODAY.start}</span>
            <span className="text-brand-700">{now.format('HH:mm')}</span>
            <span>{SCHEDULE_TODAY.end}</span>
          </div>
          <div className="relative mt-2 h-2 w-full rounded-full bg-surface-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: easeOutStrong }}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
            />
            <motion.div
              initial={{ left: 0 }}
              animate={{ left: `${pct}%` }}
              transition={{ duration: 0.6, ease: easeOutStrong }}
              className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-brand-600 shadow-[0_2px_8px_rgba(8,145,178,0.45)]"
            />
          </div>
          <p className="mt-3 text-xs text-surface-500">
            <span className="font-medium text-surface-900 tabular-nums">
              {Math.floor((totalMin - elapsedMin) / 60)}h {(totalMin - elapsedMin) % 60}m
            </span>{' '}
            until shift end
          </p>
        </div>

        {/* Details */}
        <ul className="mt-6 space-y-3 text-sm">
          <DetailRow icon={Clock} label="Hours" value="8h regular + 1h break" />
          <DetailRow icon={Coffee} label="Break" value={SCHEDULE_TODAY.break} />
          <DetailRow icon={MapPin} label="Location" value={SCHEDULE_TODAY.location} />
        </ul>

        <button
          type="button"
          className="mt-5 inline-flex w-full items-center justify-between gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs font-medium text-surface-700 hover:bg-surface-100 cursor-pointer transition-colors duration-200"
        >
          <span>View full week schedule</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-surface-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="font-medium text-surface-900">{value}</span>
    </li>
  );
}

function DistributionCard() {
  const segments = [
    { label: 'Present', value: 142, color: 'bg-cta-500', text: 'text-cta-700' },
    { label: 'Late', value: 8, color: 'bg-amber-400', text: 'text-amber-700' },
    { label: 'On leave', value: 6, color: 'bg-blue-400', text: 'text-blue-700' },
    { label: 'Absent', value: 2, color: 'bg-red-400', text: 'text-red-700' },
  ];
  const total = segments.reduce((s, x) => s + x.value, 0);

  return (
    <Card className="lg:col-span-7">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Today's distribution</h3>
            <p className="text-xs text-surface-500">Across {total} active employees</p>
          </div>
          <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
            Department breakdown
          </Button>
        </div>

        {/* Stacked bar */}
        <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-surface-100">
          {segments.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ width: 0 }}
              animate={{ width: `${(s.value / total) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: easeOutStrong }}
              className={cn(s.color, 'h-full')}
            />
          ))}
        </div>

        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {segments.map((s) => (
            <li
              key={s.label}
              className="rounded-xl border border-surface-200 p-3 transition-colors duration-200 hover:bg-surface-50"
            >
              <span className={cn('inline-flex h-2 w-2 rounded-full', s.color)} />
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-surface-500">{s.label}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-surface-900">
                {s.value}
              </p>
              <p className={cn('text-[11px] font-medium', s.text)}>
                {Math.round((s.value / total) * 100)}%
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function UpcomingCard() {
  const items = [
    { time: 'Tomorrow', title: 'Regular Holiday — Eid al-Fitr', tag: 'Holiday', tone: 'warning' as const },
    { time: 'May 12', title: 'Payroll cutoff (1st half)', tag: 'Payroll', tone: 'brand' as const },
    { time: 'May 14', title: 'Quarterly OT review', tag: 'Review', tone: 'default' as const },
  ];
  return (
    <Card className="lg:col-span-5">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Coming up</h3>
            <p className="text-xs text-surface-500">Holidays, cutoffs, and reviews</p>
          </div>
        </div>

        <ul className="mt-5 space-y-2">
          {items.map((it) => (
            <li
              key={it.title}
              className="group flex items-center gap-3 rounded-xl border border-surface-200 p-3 transition-colors duration-200 hover:border-brand-200 hover:bg-brand-50/50 cursor-pointer"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-100 text-surface-500 group-hover:bg-white group-hover:text-brand-700 transition-colors">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-surface-500">{it.time}</p>
                <p className="truncate text-sm font-medium text-surface-900">{it.title}</p>
              </div>
              <Badge variant={it.tone}>{it.tag}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Daily Logs
   ────────────────────────────────────────────────────────────────── */

type LogStatus = NonNullable<AttendanceLog['status']>;

function LogsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LogStatus | 'all'>('all');
  const today = dayjs().format('YYYY-MM-DD');

  const { data, isLoading } = useAdminAttendance({
    from: today,
    to: today,
    per_page: 100,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  });

  const logs = data?.logs ?? [];

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const name = l.employee
      ? `${l.employee.user?.first_name ?? ''} ${l.employee.user?.last_name ?? ''}`.toLowerCase()
      : '';
    return name.includes(search.toLowerCase());
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
          onChange={(e) => setStatusFilter(e.target.value as LogStatus | 'all')}
          className="h-10 rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          <option value="all">All statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="undertime">Undertime</option>
          <option value="absent">Absent</option>
          <option value="on_leave">On Leave</option>
          <option value="holiday">Holiday</option>
        </select>

        <Button variant="secondary" size="md" leftIcon={<Filter className="h-4 w-4" />}>
          More filters
        </Button>
        <div className="ml-auto text-xs text-surface-500">
          Showing <span className="font-medium text-surface-900 tabular-nums">{filtered.length}</span> of{' '}
          <span className="tabular-nums">{logs.length}</span> records
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/60">
                {['Employee', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Location', ''].map((h) => (
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
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-surface-500">
                    Loading attendance logs…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-100 text-surface-400">
                        <Clock className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-surface-900">No matching logs</p>
                      <p className="text-xs text-surface-500">Try a different search or filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((log) => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-surface-100 px-4 py-3 text-xs text-surface-500">
          <span>Last refreshed {dayjs().format('h:mm A')}</span>
          <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
            View all logs
          </Button>
        </div>
      </Card>
    </div>
  );
}

function LogRow({ log }: { log: AttendanceLog }) {
  const fullName = log.employee
    ? `${log.employee.user?.first_name ?? ''} ${log.employee.user?.last_name ?? ''}`.trim()
    : 'Unknown';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const position = log.employee?.position?.name ?? '—';
  const clockIn = log.clock_in_at ? dayjs(log.clock_in_at).format('HH:mm') : null;
  const clockOut = log.clock_out_at ? dayjs(log.clock_out_at).format('HH:mm') : null;
  const hours = Number(log.regular_hours ?? 0) + Number(log.overtime_hours ?? 0);
  return (
    <tr className="border-b border-surface-50 transition-colors duration-200 last:border-0 hover:bg-surface-50">
      {/* Employee */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-surface-900">{fullName}</p>
            <p className="text-xs text-surface-500">{position}</p>
          </div>
        </div>
      </td>

      {/* Clock In / Out */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-cta-500/10 px-2 py-0.5 text-xs font-medium tabular-nums text-cta-700 ring-1 ring-inset ring-cta-500/15">
          <Play className="h-2.5 w-2.5" />
          {clockIn ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        {clockOut ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-100 px-2 py-0.5 text-xs font-medium tabular-nums text-surface-700 ring-1 ring-inset ring-surface-200">
            <Square className="h-2.5 w-2.5" />
            {clockOut}
          </span>
        ) : (
          <span className="text-xs text-surface-400">—</span>
        )}
      </td>

      {/* Hours */}
      <td className="px-4 py-3">
        <span className="text-sm font-semibold tabular-nums text-surface-900">
          {hours.toFixed(1)}
          <span className="ml-0.5 text-xs font-normal text-surface-400">h</span>
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={log.status} />
      </td>

      {/* Location */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-surface-600">
          <MapPin className="h-3 w-3 text-surface-400" />
          {log.location === 'on_site' ? 'On-site' : log.location === 'remote' ? 'Remote' : 'Field'}
        </span>
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 transition-colors duration-200 hover:bg-surface-100 hover:text-surface-900"
          aria-label={`Open log for ${fullName}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

const STATUS_CFG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'default' }> = {
  present: { label: 'Present', variant: 'success' },
  late: { label: 'Late', variant: 'warning' },
  undertime: { label: 'Undertime', variant: 'danger' },
  absent: { label: 'Absent', variant: 'default' },
  on_leave: { label: 'On Leave', variant: 'info' },
  holiday: { label: 'Holiday', variant: 'brand' },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const c = STATUS_CFG[status] ?? { label: status, variant: 'default' as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Schedule
   ────────────────────────────────────────────────────────────────── */

function ScheduleTab() {
  const days = WEEK_DATA.map((d) => ({
    ...d,
    employees: d.future ? [] : ['CR', 'MV', 'SL', 'DC', 'JG', 'AB'].slice(0, d.weekend ? 2 : 6),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Snapshot card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-surface-900">This week at a glance</h3>
              <p className="text-xs text-surface-500">May 4 — May 10, 2026</p>
            </div>
            <Link
              to="/schedule"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-200 bg-surface-0 px-3 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-100 transition-colors duration-200"
            >
              Open Schedule module
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((d) => (
              <div
                key={d.day}
                className={cn(
                  'flex flex-col gap-3 rounded-xl border p-3 transition-colors duration-200',
                  d.today
                    ? 'border-brand-200 bg-brand-50/60'
                    : d.weekend
                      ? 'border-surface-100 bg-surface-50/60'
                      : 'border-surface-200 bg-surface-0 hover:bg-surface-50',
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn('text-xs font-semibold uppercase tracking-wide', d.today ? 'text-brand-700' : 'text-surface-500')}>
                      {d.day}
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-surface-900">{d.date.split(' ')[1]}</p>
                  </div>
                  {d.today ? <Badge variant="brand">Today</Badge> : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  {d.employees.length === 0 ? (
                    <span className="text-[11px] text-surface-400">{d.weekend ? 'Rest day' : 'No shift'}</span>
                  ) : (
                    d.employees.slice(0, 5).map((init, i) => (
                      <span
                        key={i}
                        className="grid h-6 w-6 place-items-center rounded-full bg-surface-0 text-[10px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-100"
                      >
                        {init}
                      </span>
                    ))
                  )}
                  {d.employees.length > 5 ? (
                    <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-surface-100 px-1 text-[10px] font-semibold text-surface-600">
                      +{d.employees.length - 5}
                    </span>
                  ) : null}
                </div>
                <div className="text-[10px] tabular-nums text-surface-500">
                  {d.future || d.weekend ? '—' : '09:00 – 18:00'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-link CTA */}
      <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-surface-0">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-700">
              Shift &amp; Scheduling Module
            </p>
            <h3 className="mt-1 text-base font-semibold text-surface-900">
              Build rotating rosters, manage templates, and resolve swap requests
            </h3>
            <p className="mt-1 text-sm text-surface-600">
              The full module covers calendars, conflict detection, holiday tagging, and auto-assignment.
            </p>
          </div>
          <Link
            to="/schedule"
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-1)] hover:bg-brand-700 transition-colors duration-200 active:scale-[0.97] ease-out-strong"
          >
            Open Schedule
            <ChevronRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Corrections
   ────────────────────────────────────────────────────────────────── */

function CorrectionsTab() {
  const { data, isLoading } = useAdminCorrections({ status: 'pending', per_page: 50 });
  const corrections = data?.corrections ?? [];
  const approve = useApproveCorrection();
  const reject = useRejectCorrection();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-surface-900">Pending corrections</h3>
              <p className="text-xs text-surface-500">Review and approve attendance edits</p>
            </div>
            <Badge variant="warning">{corrections.length} pending</Badge>
          </div>

          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-surface-500">Loading corrections…</div>
          ) : corrections.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-surface-900">No pending corrections</p>
              <p className="mt-1 text-xs text-surface-500">All caught up!</p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-100">
              {corrections.map((c) => {
                const empName = c.employee
                  ? `${c.employee.user?.first_name ?? ''} ${c.employee.user?.last_name ?? ''}`.trim()
                  : 'Unknown';
                const initials = empName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                return (
                  <li
                    key={c.id}
                    className="group flex items-start gap-4 px-6 py-4 transition-colors duration-200 hover:bg-surface-50"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-surface-900">{empName}</p>
                        <span className="text-xs text-surface-400">·</span>
                        <p className="text-xs text-surface-500">{dayjs(c.work_date).format('MMM D')}</p>
                      </div>
                      <p className="mt-0.5 text-sm text-surface-600">{c.reason}</p>
                      <p className="mt-1 text-xs text-surface-400">{dayjs(c.created_at).format('MMM D, h:mm A')}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={reject.isPending}
                        onClick={() => reject.mutate({ id: c.id, note: 'Declined by admin' })}
                      >
                        Decline
                      </Button>
                      <Button
                        variant="cta"
                        size="sm"
                        loading={approve.isPending}
                        onClick={() => approve.mutate({ id: c.id })}
                      >
                        Approve
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:col-span-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold tracking-tight text-surface-900">This month</h3>
            <p className="text-xs text-surface-500">Correction activity</p>
            <ul className="mt-5 space-y-4">
              <SummaryRow label="Pending" value={String(corrections.length)} tone="text-amber-700" />
            </ul>
          </CardContent>
        </Card>

        <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-surface-0">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Need to fix a log?</h3>
            <p className="mt-1 text-xs text-surface-600">
              File a correction request. Your manager will review and approve.
            </p>
            <Button className="mt-4" variant="primary" leftIcon={<Plus className="h-4 w-4" />} fullWidth>
              File correction
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
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

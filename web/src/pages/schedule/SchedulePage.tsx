import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarRange,
  CalendarDays,
  Users2,
  Repeat,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Sun,
  Moon,
  Sunrise,
  CloudMoon,
  Coffee,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeftRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Settings2,
  X,
  PartyPopper,
  ShieldCheck,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';

/* ──────────────────────────────────────────────────────────────────
   Motion
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
   Domain types & mock data
   ────────────────────────────────────────────────────────────────── */

type ShiftKind = 'day' | 'evening' | 'night' | 'half' | 'rest' | 'custom';

interface ShiftTemplate {
  id: string;
  name: string;
  kind: ShiftKind;
  start: string; // 24h
  end: string;
  breakMin: number;
  color: string; // tailwind class for the leading bar
  bg: string; // soft bg for blocks
  ring: string;
  text: string;
  icon: typeof Sun;
}

const TEMPLATES: ShiftTemplate[] = [
  { id: 't-day', name: 'Day Shift', kind: 'day', start: '09:00', end: '18:00', breakMin: 60, color: 'bg-brand-500', bg: 'bg-brand-50', ring: 'ring-brand-100', text: 'text-brand-800', icon: Sun },
  { id: 't-eve', name: 'Evening', kind: 'evening', start: '14:00', end: '23:00', breakMin: 60, color: 'bg-amber-500', bg: 'bg-amber-50', ring: 'ring-amber-100', text: 'text-amber-800', icon: Sunrise },
  { id: 't-night', name: 'Night Shift', kind: 'night', start: '22:00', end: '07:00', breakMin: 60, color: 'bg-indigo-500', bg: 'bg-indigo-50', ring: 'ring-indigo-100', text: 'text-indigo-800', icon: Moon },
  { id: 't-half', name: 'Half Day', kind: 'half', start: '09:00', end: '13:00', breakMin: 0, color: 'bg-cta-500', bg: 'bg-cta-500/10', ring: 'ring-cta-500/20', text: 'text-cta-700', icon: CloudMoon },
];

interface Employee {
  id: string;
  name: string;
  initials: string;
  position: string;
  department: string;
}

const EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Camille Reyes', initials: 'CR', position: 'Senior Designer', department: 'Design' },
  { id: 'e2', name: 'Marco Villanueva', initials: 'MV', position: 'Engineering Lead', department: 'Engineering' },
  { id: 'e3', name: 'Sofia Lim', initials: 'SL', position: 'HR Specialist', department: 'People' },
  { id: 'e4', name: 'Daniel Cruz', initials: 'DC', position: 'Account Manager', department: 'Sales' },
  { id: 'e5', name: 'Joaquin Garcia', initials: 'JG', position: 'Field Engineer', department: 'Operations' },
  { id: 'e6', name: 'Ana Bautista', initials: 'AB', position: 'Recruiter', department: 'People' },
  { id: 'e7', name: 'Iris Domingo', initials: 'ID', position: 'Frontend Engineer', department: 'Engineering' },
  { id: 'e8', name: 'Paolo Mendoza', initials: 'PM', position: 'Data Analyst', department: 'Engineering' },
];

interface Assignment {
  employeeId: string;
  date: string; // YYYY-MM-DD
  templateId: string | 'rest';
  /** Optional conflict flag (overlap or rest-day violation) */
  conflict?: 'overlap' | 'rest_violation';
}

/** Generate seeded weekly assignments */
function buildWeekAssignments(weekStart: dayjs.Dayjs): Assignment[] {
  const out: Assignment[] = [];
  EMPLOYEES.forEach((emp, i) => {
    for (let d = 0; d < 7; d++) {
      const date = weekStart.add(d, 'day').format('YYYY-MM-DD');
      const isWeekend = d === 5 || d === 6;
      // basic rotation
      let tpl: string | 'rest' = 'rest';
      if (!isWeekend) {
        const ix = (i + d) % 4;
        tpl = ['t-day', 't-day', 't-eve', i % 3 === 0 ? 't-night' : 't-day'][ix] ?? 't-day';
      } else if (i % 4 === 0 && d === 5) {
        tpl = 't-half'; // weekend half-day for some
      }
      out.push({ employeeId: emp.id, date, templateId: tpl });
    }
  });

  // Seed two conflicts so the UI demonstrates detection
  const seedDate = weekStart.add(2, 'day').format('YYYY-MM-DD');
  const seedRest = weekStart.add(5, 'day').format('YYYY-MM-DD');
  out.push({ employeeId: 'e2', date: seedDate, templateId: 't-eve', conflict: 'overlap' });
  out.push({ employeeId: 'e5', date: seedRest, templateId: 't-day', conflict: 'rest_violation' });
  return out;
}

interface SwapRequest {
  id: string;
  from: Employee;
  to: Employee;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  age: string;
}

const SWAPS: SwapRequest[] = [
  { id: 's1', from: EMPLOYEES[0], to: EMPLOYEES[6], fromDate: '2026-05-09', toDate: '2026-05-10', reason: 'Family event — willing to cover Sunday', status: 'pending', age: '2h ago' },
  { id: 's2', from: EMPLOYEES[3], to: EMPLOYEES[1], fromDate: '2026-05-12', toDate: '2026-05-13', reason: 'Doctor appointment', status: 'pending', age: '6h ago' },
  { id: 's3', from: EMPLOYEES[5], to: EMPLOYEES[2], fromDate: '2026-05-08', toDate: '2026-05-15', reason: 'Cross-training in Manila office', status: 'approved', age: '1d ago' },
];

interface Holiday {
  date: string;
  name: string;
  type: 'regular' | 'special';
}

const HOLIDAYS: Holiday[] = [
  { date: '2026-05-08', name: 'Eid al-Fitr', type: 'regular' },
  { date: '2026-05-25', name: 'Independence Eve', type: 'special' },
];

/* ──────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */

type TabKey = 'roster' | 'calendar' | 'templates' | 'swaps' | 'config';

const TABS: { key: TabKey; label: string; icon: typeof CalendarRange; count?: number }[] = [
  { key: 'roster', label: 'Team Roster', icon: Users2 },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'templates', label: 'Shift Templates', icon: Sparkles },
  { key: 'swaps', label: 'Swap Requests', icon: Repeat, count: 2 },
  { key: 'config', label: 'Configuration', icon: Settings2 },
];

export function SchedulePage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canEdit = hasPermission('attendance.logs.edit') || hasPermission('hr.employees.edit');

  const [tab, setTab] = useState<TabKey>('roster');
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-surface-500">
            Phase 2 · Shift &amp; Scheduling
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-surface-900 sm:text-3xl">
            Schedule
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            Build rotating rosters, manage shift templates, and resolve swap requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" leftIcon={<Filter className="h-4 w-4" />}>
            Filters
          </Button>
          {canEdit ? (
            <Button
              variant="primary"
              leftIcon={<Wand2 className="h-4 w-4" />}
              onClick={() => setAutoAssignOpen(true)}
            >
              Auto-assign
            </Button>
          ) : null}
        </div>
      </motion.div>

      {/* Hero KPIs */}
      <motion.section variants={itemVariants}>
        <ScheduleKpis />
      </motion.section>

      {/* Tabs */}
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
                  layoutId="schedule-tab-bg"
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

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: easeOutStrong }}
        >
          {tab === 'roster' && <RosterTab />}
          {tab === 'calendar' && <CalendarTab />}
          {tab === 'templates' && <TemplatesTab />}
          {tab === 'swaps' && <SwapsTab />}
          {tab === 'config' && <ConfigTab />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {autoAssignOpen ? <AutoAssignDrawer onClose={() => setAutoAssignOpen(false)} /> : null}
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   KPIs
   ────────────────────────────────────────────────────────────────── */

function ScheduleKpis() {
  const items = [
    { label: 'Scheduled this week', value: '142', delta: '8 unfilled slots', icon: Users2, tone: 'brand' as const },
    { label: 'Conflicts detected', value: '2', delta: '1 rest-day · 1 overlap', icon: AlertTriangle, tone: 'warning' as const },
    { label: 'Pending swaps', value: '2', delta: 'Approve in roster', icon: Repeat, tone: 'info' as const },
    { label: 'Coverage rate', value: '94%', delta: '+3% vs last week', icon: ShieldCheck, tone: 'cta' as const },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((k) => (
        <KpiTile key={k.label} {...k} />
      ))}
    </div>
  );
}

const TONE: Record<'brand' | 'cta' | 'warning' | 'info', { iconBg: string; ring: string; text: string }> = {
  brand: { iconBg: 'bg-brand-50 text-brand-700', ring: 'ring-brand-100', text: 'text-brand-700' },
  cta: { iconBg: 'bg-cta-500/10 text-cta-700', ring: 'ring-cta-500/20', text: 'text-cta-700' },
  warning: { iconBg: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', text: 'text-amber-700' },
  info: { iconBg: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200', text: 'text-blue-700' },
};

function KpiTile({
  label,
  value,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  icon: typeof Users2;
  tone: keyof typeof TONE;
}) {
  const t = TONE[tone];
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-surface-900">{value}</p>
          <p className={cn('mt-1 text-xs font-medium', t.text)}>{delta}</p>
        </div>
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1 ring-inset', t.iconBg, t.ring)}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Team Roster (week grid w/ conflict detection)
   ────────────────────────────────────────────────────────────────── */

function RosterTab() {
  const [weekStart, setWeekStart] = useState(() => dayjs('2026-05-04')); // Monday of demo week
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string>('all');
  const [picker, setPicker] = useState<{ employeeId: string; date: string } | null>(null);

  const assignments = useMemo(() => buildWeekAssignments(weekStart), [weekStart]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')),
    [weekStart],
  );

  const departments = useMemo(
    () => ['all', ...Array.from(new Set(EMPLOYEES.map((e) => e.department)))],
    [],
  );

  const filteredEmployees = EMPLOYEES.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (department !== 'all' && e.department !== department) return false;
    return true;
  });

  const conflictCount = assignments.filter((a) => a.conflict).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg border border-surface-200 bg-surface-0 p-1">
          <button
            type="button"
            onClick={() => setWeekStart((w) => w.subtract(1, 'week'))}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-surface-500 hover:bg-surface-100 hover:text-surface-900 transition-colors duration-200"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs font-semibold tabular-nums text-surface-900">
            {weekStart.format('MMM D')} — {weekStart.add(6, 'day').format('MMM D, YYYY')}
          </span>
          <button
            type="button"
            onClick={() => setWeekStart((w) => w.add(1, 'week'))}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-surface-500 hover:bg-surface-100 hover:text-surface-900 transition-colors duration-200"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setWeekStart(dayjs('2026-05-04'))}>
          This week
        </Button>

        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="search"
            placeholder="Search team member…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-surface-200 bg-surface-0 pl-9 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600 transition-[border-color,box-shadow] duration-200"
          />
        </div>

        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="h-9 cursor-pointer rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
        >
          {departments.map((d) => (
            <option key={d} value={d}>
              {d === 'all' ? 'All departments' : d}
            </option>
          ))}
        </select>

        {conflictCount > 0 ? (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
            <AlertTriangle className="h-3 w-3" />
            {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
          </span>
        ) : null}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500">
        {TEMPLATES.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-full', t.color)} />
            <span className="font-medium text-surface-700">{t.name}</span>
            <span className="tabular-nums text-surface-400">· {t.start}–{t.end}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-surface-300" />
          <span className="font-medium text-surface-700">Rest day</span>
        </span>
      </div>

      {/* Roster grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            {/* Header row */}
            <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-surface-100 bg-surface-50/60">
              <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-surface-500">
                Employee
              </div>
              {days.map((d) => {
                const isWeekend = d.day() === 0 || d.day() === 6;
                const isToday = d.isSame(dayjs('2026-05-07'), 'day');
                const holiday = HOLIDAYS.find((h) => h.date === d.format('YYYY-MM-DD'));
                return (
                  <div
                    key={d.toString()}
                    className={cn(
                      'border-l border-surface-100 px-3 py-3',
                      isToday && 'bg-brand-50/50',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'text-[11px] font-semibold uppercase tracking-wide',
                          isToday ? 'text-brand-700' : isWeekend ? 'text-surface-400' : 'text-surface-500',
                        )}
                      >
                        {d.format('ddd')}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-surface-900">{d.format('D')}</span>
                    </div>
                    {holiday ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
                        <PartyPopper className="h-3 w-3" />
                        {holiday.name}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Body rows */}
            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-100 text-surface-400">
                  <Users2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-surface-900">No team members match</p>
                <p className="text-xs text-surface-500">Adjust search or department filter.</p>
              </div>
            ) : (
              filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-surface-50 last:border-0 hover:bg-surface-50/40 transition-colors duration-200"
                >
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
                      {emp.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-surface-900">{emp.name}</p>
                      <p className="truncate text-[11px] text-surface-500">{emp.position}</p>
                    </div>
                  </div>
                  {days.map((d) => {
                    const dateKey = d.format('YYYY-MM-DD');
                    const a = assignments.find((x) => x.employeeId === emp.id && x.date === dateKey);
                    const tpl = a && a.templateId !== 'rest' ? TEMPLATES.find((t) => t.id === a.templateId) : null;
                    const isHoliday = HOLIDAYS.some((h) => h.date === dateKey);
                    return (
                      <div key={dateKey} className="border-l border-surface-100 p-1.5">
                        <ShiftCell
                          tpl={tpl ?? null}
                          isRest={!a || a.templateId === 'rest'}
                          conflict={a?.conflict}
                          isHoliday={isHoliday}
                          onPick={() => setPicker({ employeeId: emp.id, date: dateKey })}
                        />
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {picker ? (
          <ShiftPickerModal
            employee={EMPLOYEES.find((e) => e.id === picker.employeeId)!}
            date={picker.date}
            onClose={() => setPicker(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ShiftCell({
  tpl,
  isRest,
  conflict,
  isHoliday,
  onPick,
}: {
  tpl: ShiftTemplate | null;
  isRest: boolean;
  conflict?: 'overlap' | 'rest_violation';
  isHoliday: boolean;
  onPick: () => void;
}) {
  if (isRest) {
    return (
      <button
        type="button"
        onClick={onPick}
        className={cn(
          'group flex h-[58px] w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-surface-200 text-[11px] font-medium text-surface-400',
          'transition-colors duration-200 hover:border-brand-200 hover:bg-brand-50/40 hover:text-brand-700',
          isHoliday && 'border-amber-200 bg-amber-50/30',
        )}
      >
        <span className="inline-flex items-center gap-1">
          <Coffee className="h-3 w-3" />
          Rest
        </span>
      </button>
    );
  }
  if (!tpl) return null;
  const Icon = tpl.icon;
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'group relative flex h-[58px] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-lg p-2 text-left',
        'ring-1 ring-inset transition-colors duration-200',
        tpl.bg,
        tpl.ring,
        'hover:brightness-[0.98]',
        conflict && 'ring-2 ring-amber-400 bg-amber-50',
      )}
    >
      <span className={cn('absolute inset-y-1 left-1 w-1 rounded-full', tpl.color)} />
      <div className="ml-2 flex items-start justify-between gap-1">
        <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide', conflict ? 'text-amber-800' : tpl.text)}>
          <Icon className="h-3 w-3" />
          {tpl.name.split(' ')[0]}
        </span>
        {conflict ? <AlertTriangle className="h-3 w-3 text-amber-600" /> : null}
      </div>
      <span className={cn('ml-2 text-[11px] font-medium tabular-nums', conflict ? 'text-amber-900' : 'text-surface-700')}>
        {tpl.start}–{tpl.end}
      </span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Shift picker modal (assign / change / clear)
   ────────────────────────────────────────────────────────────────── */

function ShiftPickerModal({
  employee,
  date,
  onClose,
}: {
  employee: Employee;
  date: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: easeOutStrong }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.22, ease: easeOutStrong }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-surface-0 shadow-[var(--shadow-3)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-100 p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-surface-500">
              {dayjs(date).format('dddd, MMMM D')}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-surface-900">Assign shift to {employee.name}</h3>
            <p className="text-xs text-surface-500">{employee.position} · {employee.department}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1.5 p-3">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={onClose}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-surface-200 p-3 text-left transition-colors duration-200 hover:border-brand-200 hover:bg-brand-50/40"
              >
                <span className={cn('grid h-9 w-9 place-items-center rounded-lg', t.bg, 'ring-1 ring-inset', t.ring)}>
                  <Icon className={cn('h-4 w-4', t.text)} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-900">{t.name}</p>
                  <p className="text-xs tabular-nums text-surface-500">
                    {t.start} – {t.end} · {t.breakMin}m break
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-surface-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-700" />
              </button>
            );
          })}
          <button
            type="button"
            onClick={onClose}
            className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed border-surface-200 p-3 text-left transition-colors duration-200 hover:border-surface-300 hover:bg-surface-50"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-100 ring-1 ring-inset ring-surface-200">
              <Coffee className="h-4 w-4 text-surface-500" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-surface-900">Mark as rest day</p>
              <p className="text-xs text-surface-500">Removes any existing shift assignment</p>
            </div>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-surface-100 p-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={onClose}>Save assignment</Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Calendar (month view, employee-focused)
   ────────────────────────────────────────────────────────────────── */

function CalendarTab() {
  const [cursor, setCursor] = useState(() => dayjs('2026-05-01'));
  const [employeeId, setEmployeeId] = useState<string>('e1');

  const monthStart = cursor.startOf('month');
  const gridStart = monthStart.startOf('week'); // Sunday-first
  const cells = Array.from({ length: 42 }, (_, i) => gridStart.add(i, 'day'));

  const assignments = useMemo(() => {
    // build assignments for the visible range using week generator stitched
    const map = new Map<string, Assignment>();
    let w = gridStart;
    for (let i = 0; i < 6; i++) {
      buildWeekAssignments(w).forEach((a) => {
        if (a.employeeId === employeeId) map.set(a.date, a);
      });
      w = w.add(1, 'week');
    }
    return map;
  }, [gridStart, employeeId]);

  const counts = useMemo(() => {
    let day = 0, eve = 0, night = 0, half = 0, rest = 0;
    cells.forEach((c) => {
      if (c.month() !== cursor.month()) return;
      const a = assignments.get(c.format('YYYY-MM-DD'));
      if (!a || a.templateId === 'rest') rest++;
      else if (a.templateId === 't-day') day++;
      else if (a.templateId === 't-eve') eve++;
      else if (a.templateId === 't-night') night++;
      else if (a.templateId === 't-half') half++;
    });
    return { day, eve, night, half, rest };
  }, [cells, assignments, cursor]);

  const employee = EMPLOYEES.find((e) => e.id === employeeId)!;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-9">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-surface-100 px-5 py-4">
            <div className="inline-flex items-center gap-1 rounded-lg border border-surface-200 bg-surface-0 p-1">
              <button
                type="button"
                onClick={() => setCursor((c) => c.subtract(1, 'month'))}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-surface-500 hover:bg-surface-100 hover:text-surface-900 transition-colors duration-200"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm font-semibold tabular-nums text-surface-900">
                {cursor.format('MMMM YYYY')}
              </span>
              <button
                type="button"
                onClick={() => setCursor((c) => c.add(1, 'month'))}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-surface-500 hover:bg-surface-100 hover:text-surface-900 transition-colors duration-200"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setCursor(dayjs('2026-05-01'))}>
              Today
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="h-9 cursor-pointer rounded-lg border border-surface-200 bg-surface-0 px-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
              >
                {EMPLOYEES.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-surface-100 bg-surface-50/40">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-surface-500"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 grid-rows-6 gap-px bg-surface-100">
            {cells.map((d) => {
              const dateKey = d.format('YYYY-MM-DD');
              const inMonth = d.month() === cursor.month();
              const isToday = d.isSame(dayjs('2026-05-07'), 'day');
              const isWeekend = d.day() === 0 || d.day() === 6;
              const a = assignments.get(dateKey);
              const tpl = a && a.templateId !== 'rest' ? TEMPLATES.find((t) => t.id === a.templateId) : null;
              const holiday = HOLIDAYS.find((h) => h.date === dateKey);
              return (
                <div
                  key={dateKey}
                  className={cn(
                    'min-h-[96px] bg-surface-0 p-2 transition-colors duration-200 hover:bg-surface-50/60',
                    !inMonth && 'bg-surface-50/40',
                    isToday && 'ring-2 ring-inset ring-brand-200',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'text-xs font-semibold tabular-nums',
                        !inMonth ? 'text-surface-300' : isToday ? 'text-brand-700' : isWeekend ? 'text-surface-400' : 'text-surface-700',
                      )}
                    >
                      {d.format('D')}
                    </span>
                    {holiday ? (
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" title={holiday.name} />
                    ) : null}
                  </div>

                  {tpl ? (
                    <div className={cn('mt-1.5 rounded-md px-1.5 py-1 ring-1 ring-inset', tpl.bg, tpl.ring)}>
                      <div className={cn('text-[10px] font-semibold uppercase tracking-wide', tpl.text)}>
                        {tpl.name}
                      </div>
                      <div className="text-[10px] tabular-nums text-surface-600">
                        {tpl.start} – {tpl.end}
                      </div>
                    </div>
                  ) : (
                    inMonth && (
                      <div className="mt-1.5 text-[10px] font-medium text-surface-300">Rest</div>
                    )
                  )}

                  {holiday && inMonth ? (
                    <div className="mt-1 truncate text-[10px] text-amber-700">{holiday.name}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:col-span-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
                {employee.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-surface-900">{employee.name}</p>
                <p className="truncate text-[11px] text-surface-500">{employee.position}</p>
              </div>
            </div>

            <h4 className="mt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-500">
              {cursor.format('MMMM')} summary
            </h4>
            <ul className="mt-3 space-y-2.5 text-sm">
              <SummaryLine color="bg-brand-500" label="Day" value={counts.day} />
              <SummaryLine color="bg-amber-500" label="Evening" value={counts.eve} />
              <SummaryLine color="bg-indigo-500" label="Night" value={counts.night} />
              <SummaryLine color="bg-cta-500" label="Half day" value={counts.half} />
              <SummaryLine color="bg-surface-300" label="Rest" value={counts.rest} />
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-500">
              Holidays in view
            </h4>
            <ul className="mt-3 space-y-2">
              {HOLIDAYS.map((h) => (
                <li
                  key={h.date}
                  className="flex items-center gap-2.5 rounded-lg border border-amber-100 bg-amber-50/60 p-2.5"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-700">
                    <PartyPopper className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-surface-900">{h.name}</p>
                    <p className="text-[10px] tabular-nums text-surface-500">
                      {dayjs(h.date).format('MMM D')} · {h.type === 'regular' ? 'Regular' : 'Special'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryLine({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-surface-600">
        <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-surface-900">{value}</span>
    </li>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Shift Templates (CRUD UI)
   ────────────────────────────────────────────────────────────────── */

function TemplatesTab() {
  const [editing, setEditing] = useState<ShiftTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Shift templates</h3>
            <p className="text-xs text-surface-500">Reusable shift definitions assigned to roster slots</p>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
            New template
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.id} t={t} onEdit={() => setEditing(t)} />
          ))}

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="group flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-300 bg-surface-50/40 p-6 text-center transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-100 text-surface-500 transition-colors duration-200 group-hover:bg-brand-100 group-hover:text-brand-700">
              <Plus className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-surface-700 group-hover:text-brand-700">
              Create a new shift template
            </p>
            <p className="max-w-xs text-xs text-surface-500">
              Define hours, break, and color. Assignable to any employee or department.
            </p>
          </button>
        </div>
      </div>

      <Card className="lg:col-span-4 self-start">
        <CardContent className="p-5">
          <h4 className="text-base font-semibold tracking-tight text-surface-900">Best practices</h4>
          <p className="text-xs text-surface-500">PH Labor Code defaults</p>
          <ul className="mt-4 space-y-3 text-sm">
            <Tip text="Standard workday = 8h with 1h unpaid meal break." />
            <Tip text="Night shift differential applies between 10:00 PM and 6:00 AM." />
            <Tip text="Maximum 6 consecutive working days; the 7th must be a rest day." />
            <Tip text="Overtime kicks in past the 8th hour or on rest days/holidays." />
          </ul>
        </CardContent>
      </Card>

      <AnimatePresence>
        {editing ? <TemplateEditor t={editing} onClose={() => setEditing(null)} /> : null}
        {creating ? <TemplateEditor onClose={() => setCreating(false)} /> : null}
      </AnimatePresence>
    </div>
  );
}

function TemplateCard({ t, onEdit }: { t: ShiftTemplate; onEdit: () => void }) {
  const Icon = t.icon;
  const totalHours = computeShiftHours(t.start, t.end) - t.breakMin / 60;
  return (
    <Card className="group relative overflow-hidden transition-shadow duration-200 hover:shadow-[var(--shadow-2)]">
      <span className={cn('absolute inset-y-0 left-0 w-1', t.color)} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className={cn('grid h-9 w-9 place-items-center rounded-lg ring-1 ring-inset', t.bg, t.ring)}>
              <Icon className={cn('h-4 w-4', t.text)} />
            </span>
            <div>
              <p className="text-sm font-semibold text-surface-900">{t.name}</p>
              <p className="text-xs tabular-nums text-surface-500">
                {t.start} – {t.end}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              type="button"
              onClick={onEdit}
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors duration-200"
              aria-label={`Edit ${t.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
              aria-label={`Delete ${t.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Net hours" value={`${totalHours.toFixed(1)}h`} />
          <Stat label="Break" value={t.breakMin > 0 ? `${t.breakMin}m` : 'None'} />
          <Stat label="Kind" value={t.kind} />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-surface-500">
          <span className="inline-flex items-center gap-1.5">
            <Users2 className="h-3 w-3" />
            <span className="tabular-nums text-surface-700">{(Math.random() * 24 + 4) | 0}</span> assigned
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex cursor-pointer items-center gap-1 text-brand-700 hover:underline transition-colors duration-200"
          >
            Manage
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-50 px-2 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-surface-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums capitalize text-surface-900">{value}</p>
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
        <CheckCircle2 className="h-3 w-3" />
      </span>
      <span className="text-sm text-surface-700">{text}</span>
    </li>
  );
}

function TemplateEditor({ t, onClose }: { t?: ShiftTemplate; onClose: () => void }) {
  const [name, setName] = useState(t?.name ?? '');
  const [start, setStart] = useState(t?.start ?? '09:00');
  const [end, setEnd] = useState(t?.end ?? '18:00');
  const [breakMin, setBreakMin] = useState(t?.breakMin ?? 60);
  const net = (computeShiftHours(start, end) - breakMin / 60).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: easeOutStrong }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.22, ease: easeOutStrong }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-surface-0 shadow-[var(--shadow-3)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-100 p-5">
          <div>
            <h3 className="text-base font-semibold text-surface-900">{t ? 'Edit template' : 'New shift template'}</h3>
            <p className="text-xs text-surface-500">Defaults follow Asia/Manila local time</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g., Morning Shift"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time">
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="input-field tabular-nums"
              />
            </Field>
            <Field label="End time">
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="input-field tabular-nums"
              />
            </Field>
          </div>

          <Field label="Break duration (minutes)">
            <input
              type="number"
              min={0}
              max={240}
              value={breakMin}
              onChange={(e) => setBreakMin(Number(e.target.value))}
              className="input-field tabular-nums"
            />
          </Field>

          <div className="rounded-xl border border-surface-200 bg-surface-50/60 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500">Computed</p>
            <p className="mt-1 text-surface-700">
              Net workable time:{' '}
              <span className="font-semibold tabular-nums text-surface-900">{net}h</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-surface-100 p-4">
          {t ? (
            <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
              Delete
            </Button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={onClose}>{t ? 'Save changes' : 'Create template'}</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-surface-700">{label}</span>
      {children}
    </label>
  );
}

function computeShiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Swap Requests
   ────────────────────────────────────────────────────────────────── */

function SwapsTab() {
  const [filter, setFilter] = useState<'all' | SwapRequest['status']>('pending');
  const filtered = SWAPS.filter((s) => filter === 'all' || s.status === filter);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-surface-900">Shift swap requests</h3>
            <p className="text-xs text-surface-500">Employee-to-employee, manager approved</p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border border-surface-200 bg-surface-0 p-1 text-xs">
            {(['pending', 'approved', 'declined', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'cursor-pointer rounded-md px-2.5 py-1 capitalize transition-colors duration-200',
                  filter === f ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:text-surface-900',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <ul className="divide-y divide-surface-100">
          {filtered.length === 0 ? (
            <li className="px-5 py-16 text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-surface-100 text-surface-400">
                <Repeat className="h-5 w-5" />
              </div>
              <p className="mt-2 text-sm font-medium text-surface-900">No swap requests</p>
              <p className="text-xs text-surface-500">When team members trade shifts, requests will appear here.</p>
            </li>
          ) : (
            filtered.map((s) => <SwapRow key={s.id} swap={s} />)
          )}
        </ul>
      </Card>

      <div className="flex flex-col gap-4 lg:col-span-4">
        <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-surface-0">
          <CardContent className="p-5">
            <h4 className="text-base font-semibold text-surface-900">How swaps work</h4>
            <ol className="mt-3 space-y-2.5 text-sm">
              <SwapStep n={1} text="An employee proposes trading their shift with a teammate." />
              <SwapStep n={2} text="The teammate accepts (or declines) the proposal." />
              <SwapStep n={3} text="Manager approves; both shifts are reassigned and audited." />
            </ol>
            <Button className="mt-4" variant="primary" size="sm" fullWidth leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Propose swap
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-500">
              This month
            </h4>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex items-center justify-between"><span className="text-surface-600">Submitted</span><span className="font-semibold tabular-nums text-surface-900">14</span></li>
              <li className="flex items-center justify-between"><span className="text-surface-600">Approved</span><span className="font-semibold tabular-nums text-cta-700">11</span></li>
              <li className="flex items-center justify-between"><span className="text-surface-600">Declined</span><span className="font-semibold tabular-nums text-red-600">1</span></li>
              <li className="flex items-center justify-between"><span className="text-surface-600">Pending</span><span className="font-semibold tabular-nums text-amber-700">2</span></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SwapRow({ swap }: { swap: SwapRequest }) {
  const tone =
    swap.status === 'pending' ? { label: 'Pending', variant: 'warning' as const, icon: Clock }
    : swap.status === 'approved' ? { label: 'Approved', variant: 'success' as const, icon: CheckCircle2 }
    : { label: 'Declined', variant: 'danger' as const, icon: XCircle };
  const ToneIcon = tone.icon;

  return (
    <li className="group flex items-start gap-4 px-5 py-4 transition-colors duration-200 hover:bg-surface-50">
      {/* Avatars */}
      <div className="flex shrink-0 -space-x-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 ring-2 ring-surface-0">
          {swap.from.initials}
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-[11px] font-semibold text-amber-700 ring-2 ring-surface-0">
          {swap.to.initials}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-surface-900">{swap.from.name}</p>
          <ArrowLeftRight className="h-3.5 w-3.5 text-surface-400" />
          <p className="text-sm font-medium text-surface-900">{swap.to.name}</p>
          <Badge variant={tone.variant} className="ml-1">
            <ToneIcon className="h-3 w-3" />
            {tone.label}
          </Badge>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 font-medium text-brand-800 ring-1 ring-inset ring-brand-100">
            <Sun className="h-3 w-3" />
            {dayjs(swap.fromDate).format('MMM D')}
          </span>
          <ArrowRight className="h-3 w-3 text-surface-400" />
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-inset ring-amber-100">
            <Moon className="h-3 w-3" />
            {dayjs(swap.toDate).format('MMM D')}
          </span>
          <span className="text-surface-400">· {swap.age}</span>
        </div>

        <p className="mt-1.5 text-sm text-surface-600">{swap.reason}</p>
      </div>

      {swap.status === 'pending' ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" size="sm" leftIcon={<XCircle className="h-3.5 w-3.5" />}>
            Decline
          </Button>
          <Button variant="cta" size="sm" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            Approve
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors duration-200"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function SwapStep({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
        {n}
      </span>
      <span className="text-sm text-surface-700">{text}</span>
    </li>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tab — Configuration (rest days, holidays, conflict policy)
   ────────────────────────────────────────────────────────────────── */

function ConfigTab() {
  const [restDays, setRestDays] = useState<Record<string, boolean>>({
    Sun: true, Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: true,
  });
  const [conflictMode, setConflictMode] = useState<'block' | 'warn'>('warn');
  const [overtimeAt, setOvertimeAt] = useState(8);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-7">
        <CardContent className="p-6">
          <h3 className="text-base font-semibold tracking-tight text-surface-900">Rest day defaults</h3>
          <p className="text-xs text-surface-500">Toggle the days that are non-working by default for new employees.</p>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {(Object.keys(restDays) as (keyof typeof restDays)[]).map((d) => {
              const on = restDays[d];
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRestDays((prev) => ({ ...prev, [d]: !prev[d] }))}
                  className={cn(
                    'group flex flex-col items-center gap-1 rounded-xl border p-3 text-center cursor-pointer',
                    'transition-colors duration-200',
                    on
                      ? 'border-brand-200 bg-brand-50 text-brand-700'
                      : 'border-surface-200 bg-surface-0 text-surface-700 hover:border-brand-200 hover:bg-brand-50/40',
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide">{d}</span>
                  <span className={cn('h-1.5 w-6 rounded-full transition-colors duration-200', on ? 'bg-brand-600' : 'bg-surface-200')} />
                  <span className="text-[10px] text-surface-500">{on ? 'Rest' : 'Working'}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-surface-100 pt-5">
            <h4 className="text-sm font-semibold text-surface-900">Overtime threshold</h4>
            <p className="text-xs text-surface-500">Hours past this trigger overtime calculation.</p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={6}
                max={12}
                step={0.5}
                value={overtimeAt}
                onChange={(e) => setOvertimeAt(Number(e.target.value))}
                className="flex-1 cursor-pointer accent-brand-600"
              />
              <span className="w-16 text-right text-sm font-semibold tabular-nums text-surface-900">
                {overtimeAt}h
              </span>
            </div>
          </div>

          <div className="mt-6 border-t border-surface-100 pt-5">
            <h4 className="text-sm font-semibold text-surface-900">Conflict policy</h4>
            <p className="text-xs text-surface-500">How should the system react when assignments overlap or violate rest days?</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <PolicyOption
                active={conflictMode === 'warn'}
                onClick={() => setConflictMode('warn')}
                title="Warn"
                desc="Highlight the conflict, but allow the assignment."
                icon={AlertTriangle}
              />
              <PolicyOption
                active={conflictMode === 'block'}
                onClick={() => setConflictMode('block')}
                title="Block"
                desc="Reject conflicting assignments outright."
                icon={ShieldCheck}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-surface-900">Holidays</h3>
              <p className="text-xs text-surface-500">PH government-declared days for this month</p>
            </div>
            <Button variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add
            </Button>
          </div>

          <ul className="mt-4 space-y-2">
            {HOLIDAYS.map((h) => (
              <li
                key={h.date}
                className="flex items-center gap-3 rounded-xl border border-surface-200 p-3 transition-colors duration-200 hover:border-amber-200 hover:bg-amber-50/40"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100">
                  <PartyPopper className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-900">{h.name}</p>
                  <p className="text-[11px] tabular-nums text-surface-500">
                    {dayjs(h.date).format('dddd, MMMM D')}
                  </p>
                </div>
                <Badge variant={h.type === 'regular' ? 'warning' : 'info'}>
                  {h.type === 'regular' ? 'Regular' : 'Special'}
                </Badge>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-xl border border-surface-200 bg-surface-50/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500">Pay multipliers</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-surface-700">Regular holiday (worked)</span>
                <span className="font-semibold tabular-nums text-surface-900">200%</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-surface-700">Special holiday (worked)</span>
                <span className="font-semibold tabular-nums text-surface-900">130%</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-surface-700">Rest day (worked)</span>
                <span className="font-semibold tabular-nums text-surface-900">130%</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PolicyOption({
  active,
  onClick,
  title,
  desc,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  icon: typeof AlertTriangle;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors duration-200',
        active
          ? 'border-brand-200 bg-brand-50/60 ring-1 ring-inset ring-brand-100'
          : 'border-surface-200 bg-surface-0 hover:border-brand-200 hover:bg-brand-50/30',
      )}
    >
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            'grid h-7 w-7 place-items-center rounded-md',
            active ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-semibold text-surface-900">{title}</span>
      </span>
      <span className="text-xs text-surface-500">{desc}</span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Auto-assign drawer
   ────────────────────────────────────────────────────────────────── */

function AutoAssignDrawer({ onClose }: { onClose: () => void }) {
  const [strategy, setStrategy] = useState<'rotation' | 'fixed' | 'department'>('rotation');
  const [running, setRunning] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: easeOutStrong }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        className="ml-auto relative z-10 flex h-full w-full max-w-md flex-col bg-surface-0 shadow-[var(--shadow-3)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-100 p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
              <Wand2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-surface-900">Auto-assign shifts</h3>
              <p className="text-xs text-surface-500">Bulk-assign across your team for the upcoming week</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-900 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">Strategy</h4>
            <div className="mt-2 space-y-2">
              <StrategyOption
                active={strategy === 'rotation'}
                onClick={() => setStrategy('rotation')}
                title="Rotational"
                desc="Cycle through Day → Evening → Night patterns across the team."
                icon={Repeat}
              />
              <StrategyOption
                active={strategy === 'fixed'}
                onClick={() => setStrategy('fixed')}
                title="Fixed"
                desc="Apply the same shift template to selected employees every working day."
                icon={CalendarDays}
              />
              <StrategyOption
                active={strategy === 'department'}
                onClick={() => setStrategy('department')}
                title="By department"
                desc="Use each department's default template; fall back to Day Shift."
                icon={Users2}
              />
            </div>
          </div>

          <Field label="Apply to range">
            <div className="grid grid-cols-2 gap-3">
              <input type="date" defaultValue="2026-05-11" className="input-field tabular-nums" />
              <input type="date" defaultValue="2026-05-17" className="input-field tabular-nums" />
            </div>
          </Field>

          <Field label="Default template">
            <select className="input-field cursor-pointer" defaultValue="t-day">
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.start}–{t.end}
                </option>
              ))}
            </select>
          </Field>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="text-xs text-amber-900">
                Auto-assign will skip employees with approved leave or active swap requests, and respect rest-day defaults.
                You can review every change before saving.
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-surface-100 p-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            loading={running}
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            onClick={() => {
              setRunning(true);
              window.setTimeout(() => {
                setRunning(false);
                onClose();
              }, 800);
            }}
          >
            Generate preview
          </Button>
        </div>
      </motion.aside>
    </div>
  );
}

function StrategyOption({
  active,
  onClick,
  title,
  desc,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  icon: typeof Repeat;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors duration-200',
        active
          ? 'border-brand-200 bg-brand-50/60 ring-1 ring-inset ring-brand-100'
          : 'border-surface-200 bg-surface-0 hover:border-brand-200 hover:bg-brand-50/30',
      )}
    >
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
          active ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-surface-900">{title}</p>
        <p className="text-xs text-surface-500">{desc}</p>
      </div>
      {active ? <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-brand-700" /> : null}
    </button>
  );
}

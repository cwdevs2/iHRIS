import { motion } from 'framer-motion';
import {
  Users,
  CalendarCheck,
  Banknote,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';

interface Kpi {
  label: string;
  value: string;
  delta?: string;
  icon: typeof Users;
  tone: 'brand' | 'cta' | 'warning' | 'info';
}

const KPIS: Kpi[] = [
  { label: 'Active employees', value: '—', delta: '+0 this week', icon: Users, tone: 'brand' },
  { label: 'On leave today', value: '—', delta: '0 returning tomorrow', icon: CalendarCheck, tone: 'info' },
  { label: 'Late today', value: '—', delta: 'within scheduled shift', icon: Clock, tone: 'warning' },
  { label: 'Next payroll', value: '—', delta: 'period closes in N days', icon: Banknote, tone: 'cta' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOutStrong } },
};

const toneClasses: Record<Kpi['tone'], { bg: string; ring: string; iconBg: string; iconText: string }> = {
  brand: { bg: 'bg-brand-50', ring: 'ring-brand-100', iconBg: 'bg-brand-600', iconText: 'text-white' },
  cta: { bg: 'bg-cta-500/10', ring: 'ring-cta-500/20', iconBg: 'bg-cta-600', iconText: 'text-white' },
  warning: { bg: 'bg-amber-50', ring: 'ring-amber-100', iconBg: 'bg-amber-500', iconText: 'text-white' },
  info: { bg: 'bg-blue-50', ring: 'ring-blue-100', iconBg: 'bg-blue-600', iconText: 'text-white' },
};

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const greeting = getGreeting();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-8">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <p className="text-sm text-surface-500">
          {dayjs().format('dddd, MMMM D')} · {user?.roles[0]?.display_name}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-surface-900">
          {greeting}, {user?.first_name}.
        </h1>
        <p className="text-sm text-surface-500">
          Here's what's happening across your organization today.
        </p>
      </motion.div>

      {/* KPI grid */}
      <motion.section variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => {
          const tone = toneClasses[kpi.tone];
          return (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="flex flex-col gap-4 px-5 pt-5 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-lg ring-1 ring-inset',
                      tone.iconBg,
                      tone.iconText,
                    )}
                  >
                    <kpi.icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-surface-300" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-surface-500">
                    {kpi.label}
                  </p>
                  <p className="mt-1.5 text-2xl font-semibold tracking-tight text-surface-900">
                    {kpi.value}
                  </p>
                  {kpi.delta ? (
                    <p className="mt-1 text-xs text-surface-500">{kpi.delta}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.section>

      {/* Two-column body — placeholders until modules ship */}
      <motion.section variants={itemVariants} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-surface-900">Pending approvals</h3>
                <p className="text-xs text-surface-500">Leaves, attendance corrections, OT</p>
              </div>
            </div>
            <EmptyState
              title="You're all caught up."
              description="Approvals will appear here when employees file new requests."
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold text-surface-900">HR calendar</h3>
            <p className="text-xs text-surface-500">Holidays, payroll dates, key milestones</p>
            <EmptyState
              title="No upcoming events."
              description="Configure holidays and payroll periods to populate the calendar."
            />
          </CardContent>
        </Card>
      </motion.section>
    </motion.div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-200 bg-surface-50 px-6 py-10 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-100 text-surface-400">
        <Clock className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-medium text-surface-900">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-surface-500">{description}</p>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

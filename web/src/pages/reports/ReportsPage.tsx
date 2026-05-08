import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarDays,
  Clock,
  Download,
  FileSpreadsheet,
  Receipt,
  TrendingUp,
  Users,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useExecutiveSummary, useExportReport } from '@/hooks/useReports';
import type { ReportType } from '@/types';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import { ReportEmployees } from './ReportEmployees';
import { ReportAttendance } from './ReportAttendance';
import { ReportLeaves } from './ReportLeaves';
import { ReportPayrollRegister } from './ReportPayrollRegister';
import { ReportRecruitment } from './ReportRecruitment';
import { ReportPerformance } from './ReportPerformance';

interface ReportEntry {
  type: ReportType;
  label: string;
  description: string;
  icon: typeof Users;
  tone: 'brand' | 'cta' | 'warning' | 'info' | 'violet' | 'emerald';
}

const REPORTS: ReportEntry[] = [
  { type: 'employees', label: 'Headcount & Turnover', description: 'Active headcount, by department, hires vs separations.', icon: Users, tone: 'brand' },
  { type: 'attendance', label: 'Attendance Summary', description: 'Daily presence, late, undertime, and overtime.', icon: Clock, tone: 'info' },
  { type: 'leaves', label: 'Leave Utilization', description: 'Approved leaves by type and status.', icon: CalendarDays, tone: 'warning' },
  { type: 'payroll-register', label: 'Payroll Register', description: 'Per-employee gross, deductions, and net pay.', icon: Receipt, tone: 'cta' },
  { type: 'recruitment', label: 'Recruitment Funnel', description: 'Applicants by stage, source, and time-to-hire.', icon: Briefcase, tone: 'violet' },
  { type: 'performance', label: 'Performance Distribution', description: 'Score distribution and top performers.', icon: TrendingUp, tone: 'emerald' },
];

const toneClasses: Record<ReportEntry['tone'], string> = {
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  cta: 'bg-cta-500/10 text-cta-700 border-cta-500/20',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutStrong } },
};

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const summary = useExecutiveSummary();
  const exportReport = useExportReport();

  const today = dayjs().format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');

  if (activeReport !== null) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveReport(null)} leftIcon={<ArrowRight className="h-4 w-4 rotate-180" />}>
            Back to Reports
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            loading={exportReport.isPending}
            onClick={() => exportReport.mutate({ type: activeReport, from: monthStart, to: today })}
          >
            Export CSV
          </Button>
        </div>

        {activeReport === 'employees' && <ReportEmployees />}
        {activeReport === 'attendance' && <ReportAttendance />}
        {activeReport === 'leaves' && <ReportLeaves />}
        {activeReport === 'payroll-register' && <ReportPayrollRegister />}
        {activeReport === 'recruitment' && <ReportRecruitment />}
        {activeReport === 'performance' && <ReportPerformance />}
      </div>
    );
  }

  const tiles = [
    {
      label: 'Total Headcount',
      value: summary.data?.headcount.total ?? '—',
      sub: `${summary.data?.headcount.active ?? '—'} active`,
      icon: Users,
      tone: 'brand' as const,
    },
    {
      label: 'New hires (MTD)',
      value: summary.data?.headcount.new_hires_mtd ?? '—',
      sub: `${summary.data?.headcount.separations_mtd ?? 0} separations`,
      icon: TrendingUp,
      tone: 'emerald' as const,
    },
    {
      label: 'Pending leaves',
      value: summary.data?.pending_leaves ?? '—',
      sub: 'Awaiting approval',
      icon: CalendarDays,
      tone: 'warning' as const,
    },
    {
      label: 'Open requisitions',
      value: summary.data?.open_requisitions ?? '—',
      sub: 'Approved & posting',
      icon: Briefcase,
      tone: 'violet' as const,
    },
    {
      label: 'Reviews in progress',
      value: summary.data?.reviews_in_progress ?? '—',
      sub: 'Across active cycles',
      icon: BarChart3,
      tone: 'info' as const,
    },
    {
      label: 'Payroll runs (MTD)',
      value: summary.data?.payroll_runs_mtd ?? '—',
      sub: 'This month',
      icon: Receipt,
      tone: 'cta' as const,
    },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-8">
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <p className="text-sm text-surface-500">Phase 7 · Analytics Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight text-surface-900">Reports & Analytics</h1>
        <p className="text-sm text-surface-500">
          Cross-module insights, compliance reports, and CSV exports for HR &amp; finance.
        </p>
      </motion.div>

      {/* Executive summary tiles */}
      <motion.section variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className="overflow-hidden">
            <CardContent className="flex items-start justify-between gap-4 px-5 pt-5 pb-5">
              <div className="flex flex-col gap-1">
                <p className="text-xs uppercase tracking-wide text-surface-500">{t.label}</p>
                <p className="font-mono text-3xl font-semibold tracking-tight text-surface-900">{t.value}</p>
                <p className="text-xs text-surface-500">{t.sub}</p>
              </div>
              <span className={cn('grid h-10 w-10 place-items-center rounded-lg border', toneClasses[t.tone])}>
                <t.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </motion.section>

      {/* Report categories */}
      <motion.div variants={itemVariants} className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-surface-900">Detailed Reports</h2>
        <span className="flex items-center gap-1 text-xs text-surface-500">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          CSV / printable views
        </span>
      </motion.div>

      <motion.section variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => (
          <button
            key={report.type}
            type="button"
            onClick={() => setActiveReport(report.type)}
            className="group cursor-pointer text-left"
          >
            <Card className="h-full transition-shadow duration-200 ease-out-strong group-hover:shadow-[var(--shadow-2)]">
              <CardContent className="flex flex-col gap-4 px-5 pt-5 pb-5">
                <span className={cn('grid h-11 w-11 place-items-center rounded-lg border', toneClasses[report.tone])}>
                  <report.icon className="h-5 w-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-surface-900">{report.label}</h3>
                  <p className="text-sm text-surface-500">{report.description}</p>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  View report
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </button>
        ))}
      </motion.section>
    </motion.div>
  );
}

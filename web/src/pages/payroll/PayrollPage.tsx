import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Banknote, Receipt, Wallet, FileBarChart2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth';
import { PeriodsTab } from './PeriodsTab';
import { RunsTab } from './RunsTab';
import { PayslipsTab } from './PayslipsTab';
import { LoansTab } from './LoansTab';
import { ReportsTab } from './ReportsTab';

type Tab = 'runs' | 'periods' | 'payslips' | 'loans' | 'reports';

const TABS: Array<{ id: Tab; label: string; icon: typeof CalendarDays; permission?: string }> = [
  { id: 'runs', label: 'Runs', icon: Banknote, permission: 'payroll.runs.view' },
  { id: 'periods', label: 'Periods', icon: CalendarDays, permission: 'payroll.periods.view' },
  { id: 'payslips', label: 'Payslips', icon: Receipt, permission: 'payroll.payslips.view_all' },
  { id: 'loans', label: 'Loans', icon: Wallet, permission: 'payroll.loans.view' },
  { id: 'reports', label: 'Reports', icon: FileBarChart2, permission: 'payroll.reports.view' },
];

export function PayrollPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const visibleTabs = TABS.filter((t) => !t.permission || hasPermission(t.permission));
  const [tab, setTab] = useState<Tab>(visibleTabs[0]?.id ?? 'runs');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Payroll</h1>
        <p className="mt-0.5 text-sm text-surface-500">
          Run PH-compliant payroll, generate payslips, manage loans, and remit statutory contributions.
        </p>
      </div>

      <div className="border-b border-surface-200">
        <nav className="-mb-px flex flex-wrap gap-x-6">
          {visibleTabs.map((t) => {
            const isActive = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'group relative flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer',
                  isActive
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-surface-500 hover:text-surface-900',
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {tab === 'runs' && <RunsTab />}
        {tab === 'periods' && <PeriodsTab />}
        {tab === 'payslips' && <PayslipsTab />}
        {tab === 'loans' && <LoansTab />}
        {tab === 'reports' && <ReportsTab />}
      </div>
    </motion.div>
  );
}

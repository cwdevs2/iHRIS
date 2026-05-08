import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckSquare, ClipboardList, BarChart2, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { CyclesTab } from './tabs/CyclesTab';
import { GoalsTab } from './tabs/GoalsTab';
import { ReviewsTab } from './tabs/ReviewsTab';
import { PerformanceAnalyticsTab } from './tabs/PerformanceAnalyticsTab';

type Tab = 'cycles' | 'goals' | 'reviews' | 'analytics';

const TABS: Array<{ id: Tab; label: string; icon: typeof Target; permission?: string }> = [
  { id: 'cycles', label: 'Cycles', icon: Target, permission: 'performance.reviews.view' },
  { id: 'goals', label: 'Goals', icon: CheckSquare, permission: 'performance.reviews.view' },
  { id: 'reviews', label: 'Reviews', icon: ClipboardList, permission: 'performance.reviews.view' },
  { id: 'analytics', label: 'Analytics', icon: BarChart2, permission: 'performance.reviews.view' },
];

export function PerformancePage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const visibleTabs = TABS.filter((t) => !t.permission || hasPermission(t.permission));
  const [tab, setTab] = useState<Tab>(visibleTabs[0]?.id ?? 'cycles');
  const [newCycleOpen, setNewCycleOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Performance</h1>
          <p className="mt-0.5 text-sm text-surface-500">
            Manage review cycles, track goals, conduct evaluations, and view performance analytics.
          </p>
        </div>

        {hasPermission('performance.reviews.manage') && (
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => { setTab('cycles'); setNewCycleOpen(true); }}
          >
            New Cycle
          </Button>
        )}
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
        {tab === 'cycles' && (
          <CyclesTab externalOpenCreate={newCycleOpen} onCreateClose={() => setNewCycleOpen(false)} />
        )}
        {tab === 'goals' && <GoalsTab />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'analytics' && <PerformanceAnalyticsTab />}
      </div>
    </motion.div>
  );
}

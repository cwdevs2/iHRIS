import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Kanban, FileText, BarChart2, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { RequisitionsTab } from './tabs/RequisitionsTab';
import { PipelineTab } from './tabs/PipelineTab';
import { PostingsTab } from './tabs/PostingsTab';
import { RecruitmentAnalyticsTab } from './tabs/RecruitmentAnalyticsTab';

type Tab = 'requisitions' | 'pipeline' | 'postings' | 'analytics';

const TABS: Array<{ id: Tab; label: string; icon: typeof Briefcase; permission?: string }> = [
  { id: 'requisitions', label: 'Requisitions', icon: FileText, permission: 'recruitment.jobs.view' },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban, permission: 'recruitment.applicants.view' },
  { id: 'postings', label: 'Job Postings', icon: Briefcase, permission: 'recruitment.jobs.view' },
  { id: 'analytics', label: 'Analytics', icon: BarChart2, permission: 'recruitment.jobs.view' },
];

export function RecruitmentPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const visibleTabs = TABS.filter((t) => !t.permission || hasPermission(t.permission));
  const [tab, setTab] = useState<Tab>(visibleTabs[0]?.id ?? 'requisitions');
  const [newReqOpen, setNewReqOpen] = useState(false);
  const [newPostingOpen, setNewPostingOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900">Recruitment</h1>
          <p className="mt-0.5 text-sm text-surface-500">
            Manage job requisitions, track applicant pipeline, and generate offer letters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('recruitment.jobs.create') && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setNewPostingOpen(true)}
            >
              New Posting
            </Button>
          )}
          {hasPermission('recruitment.jobs.create') && (
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setNewReqOpen(true)}
            >
              New Requisition
            </Button>
          )}
        </div>
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
        {tab === 'requisitions' && (
          <RequisitionsTab externalOpenCreate={newReqOpen} onCreateClose={() => setNewReqOpen(false)} />
        )}
        {tab === 'pipeline' && <PipelineTab />}
        {tab === 'postings' && (
          <PostingsTab externalOpenCreate={newPostingOpen} onCreateClose={() => setNewPostingOpen(false)} />
        )}
        {tab === 'analytics' && <RecruitmentAnalyticsTab />}
      </div>
    </motion.div>
  );
}

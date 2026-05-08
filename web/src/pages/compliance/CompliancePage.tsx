import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import { PoliciesTab } from './PoliciesTab';
import { FilingsTab } from './FilingsTab';

type Tab = 'policies' | 'filings';

const TABS: Array<{ key: Tab; label: string; icon: typeof FileText; description: string }> = [
  { key: 'policies', label: 'Policies', icon: FileText, description: 'Versioned policy library and acknowledgement tracking.' },
  { key: 'filings', label: 'Regulatory Filings', icon: ShieldAlert, description: 'SSS, PhilHealth, Pag-IBIG, BIR, DOLE filing reminders.' },
];

export function CompliancePage() {
  const [tab, setTab] = useState<Tab>('policies');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm text-surface-500">Phase 7 · Compliance</p>
        <h1 className="text-3xl font-semibold tracking-tight text-surface-900">Compliance Management</h1>
        <p className="text-sm text-surface-500">Policy library and regulatory filing schedule.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className="text-left cursor-pointer"
          >
            <Card
              className={cn(
                'transition-shadow duration-200 ease-out-strong',
                tab === entry.key ? 'border-brand-300 shadow-[var(--shadow-2)]' : 'hover:shadow-[var(--shadow-1)]',
              )}
            >
              <CardContent className="flex items-center gap-4 px-5 py-4">
                <span className={cn(
                  'grid h-10 w-10 place-items-center rounded-lg border',
                  tab === entry.key ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-surface-200 bg-surface-50 text-surface-600',
                )}>
                  <entry.icon className="h-5 w-5" />
                </span>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-surface-900">{entry.label}</span>
                  <span className="text-xs text-surface-500">{entry.description}</span>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {tab === 'policies' ? <PoliciesTab /> : <FilingsTab />}
    </motion.div>
  );
}

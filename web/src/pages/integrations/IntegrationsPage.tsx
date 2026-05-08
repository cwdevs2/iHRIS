import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, KeyRound, Webhook } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { easeOutStrong } from '@/lib/motion';
import { ApiKeysTab } from './ApiKeysTab';
import { WebhooksTab } from './WebhooksTab';
import { LogsTab } from './LogsTab';

type Tab = 'keys' | 'webhooks' | 'logs';

const TABS: Array<{ key: Tab; label: string; icon: typeof KeyRound; description: string }> = [
  { key: 'keys', label: 'API Keys', icon: KeyRound, description: 'Manage tokens for biometric, accounting & SSO integrations.' },
  { key: 'webhooks', label: 'Webhooks', icon: Webhook, description: 'Outbound event delivery to external systems.' },
  { key: 'logs', label: 'Activity Logs', icon: Activity, description: 'Audit trail of inbound and outbound integration calls.' },
];

export function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>('keys');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeOutStrong }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm text-surface-500">Phase 7 · Integrations</p>
        <h1 className="text-3xl font-semibold tracking-tight text-surface-900">API Integrations</h1>
        <p className="text-sm text-surface-500">External system bridges for biometric devices, accounting software, and SSO providers.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className="text-left cursor-pointer"
          >
            <Card className={cn(
              'transition-shadow duration-200 ease-out-strong',
              tab === entry.key ? 'border-brand-300 shadow-[var(--shadow-2)]' : 'hover:shadow-[var(--shadow-1)]',
            )}>
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

      {tab === 'keys' && <ApiKeysTab />}
      {tab === 'webhooks' && <WebhooksTab />}
      {tab === 'logs' && <LogsTab />}
    </motion.div>
  );
}

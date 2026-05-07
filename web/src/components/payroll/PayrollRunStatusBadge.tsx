import { Badge } from '@/components/ui/Badge';
import type { PayrollRunStatus } from '@/types';

const CONFIG: Record<PayrollRunStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'danger' | 'default' }> = {
  draft: { label: 'Draft', variant: 'warning' },
  finalized: { label: 'Finalized', variant: 'info' },
  paid: { label: 'Paid', variant: 'success' },
  canceled: { label: 'Canceled', variant: 'danger' },
};

export function PayrollRunStatusBadge({ status }: { status: PayrollRunStatus }) {
  const c = CONFIG[status] ?? { label: status, variant: 'default' as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

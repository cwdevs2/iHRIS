import { type EmploymentStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';

const STATUS_CONFIG: Record<EmploymentStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  regular:       { label: 'Regular',       variant: 'success' },
  probationary:  { label: 'Probationary',  variant: 'warning' },
  contractual:   { label: 'Contractual',   variant: 'info' },
  part_time:     { label: 'Part-time',     variant: 'info' },
  project_based: { label: 'Project-based', variant: 'info' },
  on_leave:      { label: 'On Leave',      variant: 'warning' },
  resigned:      { label: 'Resigned',      variant: 'danger' },
  terminated:    { label: 'Terminated',    variant: 'danger' },
};

export function EmploymentStatusBadge({ status }: { status: EmploymentStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'default' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

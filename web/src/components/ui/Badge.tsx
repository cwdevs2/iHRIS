import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        default:  'bg-surface-100 text-surface-700 ring-surface-200',
        success:  'bg-cta-500/10 text-cta-700 ring-cta-500/20',
        warning:  'bg-amber-50 text-amber-700 ring-amber-200',
        danger:   'bg-red-50 text-red-700 ring-red-200',
        info:     'bg-blue-50 text-blue-700 ring-blue-200',
        brand:    'bg-brand-50 text-brand-700 ring-brand-100',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

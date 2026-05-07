import { cn } from '@/lib/cn';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-[var(--shadow-2)]"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5 text-white" fill="none">
          <path
            d="M3 3v14M17 3v14M3 10h14M7 6h6M7 14h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showText ? (
        <span className="text-lg font-semibold tracking-tight text-surface-900">
          iHRIS<span className="text-brand-600">.</span>
        </span>
      ) : null}
    </div>
  );
}

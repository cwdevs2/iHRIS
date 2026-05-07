import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id: idProp, label, helperText, error, leftIcon, rightSlot, className, ...props },
  ref,
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const describedById = error ? `${id}-error` : helperText ? `${id}-help` : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-surface-700">
          {label}
        </label>
      ) : null}

      <div
        className={cn(
          'relative flex h-11 w-full items-center',
          'rounded-lg border bg-surface-0',
          'transition-[border-color,box-shadow] duration-200 ease-out-strong',
          error
            ? 'border-[var(--color-danger)] focus-within:ring-2 focus-within:ring-[var(--color-danger)]/20'
            : 'border-surface-200 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/15',
        )}
      >
        {leftIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-surface-400">
            {leftIcon}
          </span>
        ) : null}

        <input
          id={id}
          ref={ref}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedById}
          className={cn(
            'h-full w-full bg-transparent px-3.5 text-sm text-surface-900 placeholder:text-surface-400',
            'focus:outline-none',
            leftIcon && 'pl-10',
            rightSlot && 'pr-10',
            className,
          )}
          {...props}
        />

        {rightSlot ? (
          <span className="absolute inset-y-0 right-0 flex w-10 items-center justify-center">
            {rightSlot}
          </span>
        ) : null}
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-help`} className="text-xs text-surface-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

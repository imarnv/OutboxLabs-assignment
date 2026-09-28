import clsx from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, id, className, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'h-12 w-full rounded-lg bg-surface-muted px-4 text-sm text-ink placeholder:text-ink-faint outline-none ring-brand/30 transition focus:ring-2',
          error && 'ring-2 ring-red-300',
          className,
        )}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

export const BareInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function BareInput(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={clsx('w-full bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none', className)}
      {...rest}
    />
  );
});

export const BoxInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function BoxInput(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={clsx(
        'h-9 w-20 rounded-md border border-line bg-white px-3 text-center text-sm text-ink outline-none focus:border-brand',
        className,
      )}
      {...rest}
    />
  );
});

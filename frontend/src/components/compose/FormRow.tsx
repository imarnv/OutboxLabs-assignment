import clsx from 'clsx';
import type { ReactNode } from 'react';

export function FormRow({
  label,
  children,
  htmlFor,
  underline = true,
  invalid,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
  underline?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <label htmlFor={htmlFor} className="w-[58px] shrink-0 text-sm text-ink">
        {label}
      </label>
      <div
        className={clsx(
          'min-w-0 flex-1 py-2 pl-2',
          underline && 'border-b',
          invalid ? 'border-red-300' : 'border-line',
        )}
      >
        {children}
      </div>
    </div>
  );
}

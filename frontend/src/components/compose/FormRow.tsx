import clsx from 'clsx';
import type { ReactNode } from 'react';

export function FormRow({ label, children, className, htmlFor }: { label: string; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={clsx('flex items-center gap-4 border-b border-line py-3', className)}>
      <label htmlFor={htmlFor} className="w-[72px] shrink-0 text-sm text-ink-soft">
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

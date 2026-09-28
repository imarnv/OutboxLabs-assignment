'use client';

import clsx from 'clsx';
import { AlertIcon, CheckIcon, InfoIcon, XIcon } from '@/components/icons';
import type { Toast } from '@/context/ToastContext';

const styles = {
  success: { icon: CheckIcon, cls: 'text-brand bg-brand-light' },
  error: { icon: AlertIcon, cls: 'text-red-600 bg-red-50' },
  info: { icon: InfoIcon, cls: 'text-sky-600 bg-sky-50' },
};

export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2">
      {toasts.map((t) => {
        const { icon: Icon, cls } = styles[t.kind];
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-white p-3 shadow-pop animate-in">
            <span className={clsx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', cls)}>
              <Icon size={14} />
            </span>
            <p className="flex-1 text-sm text-ink">{t.message}</p>
            <button onClick={() => onDismiss(t.id)} className="text-ink-faint hover:text-ink" aria-label="Dismiss">
              <XIcon size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

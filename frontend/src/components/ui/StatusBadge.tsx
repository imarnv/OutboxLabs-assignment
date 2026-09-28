import clsx from 'clsx';
import { ClockIcon } from '@/components/icons';
import { formatChipTime } from '@/lib/format';
import type { EmailListItem } from '@/lib/types';

export function StatusBadge({ email, className }: { email: Pick<EmailListItem, 'status' | 'scheduledAt'>; className?: string }) {
  const base = 'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap';
  switch (email.status) {
    case 'scheduled':
      return (
        <span className={clsx(base, 'bg-orange-50 text-orange-600', className)}>
          <ClockIcon size={12} />
          {formatChipTime(email.scheduledAt)}
        </span>
      );
    case 'sending':
      return <span className={clsx(base, 'bg-sky-50 text-sky-700', className)}>Sending…</span>;
    case 'sent':
      return <span className={clsx(base, 'bg-surface-muted text-ink-soft', className)}>Sent</span>;
    case 'failed':
      return <span className={clsx(base, 'bg-red-50 text-red-600', className)}>Failed</span>;
  }
}

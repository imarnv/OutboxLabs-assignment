import clsx from 'clsx';
import { ClockIcon } from '@/components/icons';
import { formatChipTime } from '@/lib/format';
import type { EmailListItem } from '@/lib/types';

const base = 'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap';

export function StatusBadge({ email, className }: { email: Pick<EmailListItem, 'status' | 'scheduledAt'>; className?: string }) {
  switch (email.status) {
    case 'scheduled':
      return (
        <span className={clsx(base, 'border-orange-200 bg-orange-100 text-orange-700', className)}>
          <ClockIcon size={12} />
          {formatChipTime(email.scheduledAt)}
        </span>
      );
    case 'sending':
      return <span className={clsx(base, 'border-sky-200 bg-sky-50 text-sky-700', className)}>Sending</span>;
    case 'sent':
      return <span className={clsx(base, 'border-line bg-surface-muted text-ink-soft', className)}>Sent</span>;
    case 'failed':
      return <span className={clsx(base, 'border-red-200 bg-red-50 text-red-600', className)}>Failed</span>;
  }
}

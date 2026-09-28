import Link from 'next/link';
import { StarIcon } from '@/components/icons';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatFull } from '@/lib/format';
import type { EmailListItem } from '@/lib/types';

export function EmailRow({ email }: { email: EmailListItem }) {
  const timeLabel =
    email.status === 'sent' && email.sentAt
      ? `Sent ${formatFull(email.sentAt)}`
      : email.status === 'failed'
        ? `Failed: ${email.error ?? 'unknown error'}`
        : `Scheduled for ${formatFull(email.scheduledAt)}`;

  return (
    <li>
      <Link
        href={`/dashboard/email/${email.id}`}
        title={timeLabel}
        className="group flex items-center gap-4 border-b border-line px-6 py-4 transition hover:bg-surface"
      >
        <div className="w-[220px] shrink-0 truncate text-sm text-ink">
          <span className="text-ink-soft">To: </span>
          {email.recipient}
        </div>
        <StatusBadge email={email} />
        <div className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold text-ink">{email.subject}</span>
          {email.bodyPreview && <span className="text-ink-soft"> - {email.bodyPreview}</span>}
        </div>
        <StarIcon size={18} className="shrink-0 text-ink-faint group-hover:text-ink-soft" />
      </Link>
    </li>
  );
}

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArchiveIcon, ArrowLeftIcon, ExternalLinkIcon, StarIcon } from '@/components/icons';
import { IconButton } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { formatFull } from '@/lib/format';
import { sanitizeHtml } from '@/lib/sanitize';

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: email, error, loading, reload } = useAsync(() => api.getEmail(id), [id]);

  const back = () => router.push(email && (email.status === 'sent' || email.status === 'failed') ? '/dashboard/sent' : '/dashboard/scheduled');

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-line px-6 py-4">
        <IconButton label="Back" onClick={back}>
          <ArrowLeftIcon size={20} />
        </IconButton>
        {email ? (
          <>
            <h1 className="min-w-0 truncate text-lg font-semibold text-ink">{email.subject}</h1>
            <StatusBadge email={email} />
          </>
        ) : (
          <Skeleton className="h-5 w-64" />
        )}
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Star">
            <StarIcon size={18} />
          </IconButton>
          <IconButton label="Archive">
            <ArchiveIcon size={18} />
          </IconButton>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading && !email ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : error || !email ? (
          <ErrorState message={error ?? 'Email not found'} onRetry={reload} />
        ) : (
          <article className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-start gap-3">
              <Avatar name={email.sender.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-ink">{email.sender.name}</span>{' '}
                  <span className="text-ink-soft">&lt;{email.sender.email}&gt;</span>
                </p>
                <p className="text-xs text-ink-soft">to {email.recipient}</p>
              </div>
              <p className="shrink-0 text-xs text-ink-soft">
                {email.sentAt ? formatFull(email.sentAt) : formatFull(email.scheduledAt)}
              </p>
            </div>

            <div className="email-body text-sm leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body) }} />

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-line bg-surface p-4 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-ink-faint">Scheduled for</dt>
                <dd className="mt-0.5 text-ink">{formatFull(email.scheduledAt)}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Sent at</dt>
                <dd className="mt-0.5 text-ink">{email.sentAt ? formatFull(email.sentAt) : '-'}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Attempts</dt>
                <dd className="mt-0.5 text-ink">{email.attempts}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Rate-limit deferrals</dt>
                <dd className="mt-0.5 text-ink">{email.rateLimitedCount}</dd>
              </div>
              {email.error && (
                <div className="col-span-full">
                  <dt className="text-ink-faint">Last error</dt>
                  <dd className="mt-0.5 text-red-600">{email.error}</dd>
                </div>
              )}
            </dl>

            {email.previewUrl && (
              <Link
                href={email.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                View delivered message on Ethereal <ExternalLinkIcon size={14} />
              </Link>
            )}
          </article>
        )}
      </div>
    </div>
  );
}

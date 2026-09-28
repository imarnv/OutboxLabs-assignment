'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AttachmentCard } from '@/components/emails/AttachmentCard';
import { ArchiveIcon, ArrowLeftIcon, ChevronDownIcon, ExternalLinkIcon, StarIcon, TrashIcon } from '@/components/icons';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { formatDateTime, formatFull } from '@/lib/format';
import { sanitizeHtml } from '@/lib/sanitize';

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const { data: email, error, loading, reload } = useAsync(() => api.getEmail(id), [id]);

  const back = () =>
    router.push(email && (email.status === 'sent' || email.status === 'failed') ? '/dashboard/sent' : '/dashboard/scheduled');

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-4 py-4">
        <IconButton label="Back" onClick={back}>
          <ArrowLeftIcon size={20} />
        </IconButton>
        {email ? (
          <h1 className="min-w-0 truncate text-[22px] text-ink">{email.subject}</h1>
        ) : (
          <Skeleton className="h-6 w-72" />
        )}
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Star" disabled>
            <StarIcon size={18} />
          </IconButton>
          <IconButton label="Archive" disabled>
            <ArchiveIcon size={18} />
          </IconButton>
          <IconButton label="Delete" disabled>
            <TrashIcon size={18} />
          </IconButton>
          <span className="mx-2 h-8 w-px bg-line" />
          {user && <Avatar name={user.name} src={user.avatarUrl} size={32} />}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        {loading && !email ? (
          <div className="mx-auto max-w-[1040px] space-y-4 pt-4">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : error || !email ? (
          <ErrorState message={error ?? 'Email not found'} onRetry={reload} />
        ) : (
          <article className="mx-auto max-w-[1040px] pt-4">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/80 text-white">
                {email.sender.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">
                  <span className="font-semibold text-ink">{email.sender.name}</span>{' '}
                  <span className="text-xs text-ink-soft">&lt;{email.sender.email}&gt;</span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowDetails((s) => !s)}
                  className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
                >
                  to {email.recipient}
                  <ChevronDownIcon size={12} className={showDetails ? 'rotate-180 transition' : 'transition'} />
                </button>

                {showDetails && (
                  <dl className="mt-3 grid w-fit grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-line p-3 text-xs">
                    <dt className="text-ink-faint">Status</dt>
                    <dd>
                      <StatusBadge email={email} />
                    </dd>
                    <dt className="text-ink-faint">Scheduled</dt>
                    <dd className="text-ink">{formatFull(email.scheduledAt)}</dd>
                    <dt className="text-ink-faint">Sent</dt>
                    <dd className="text-ink">{email.sentAt ? formatFull(email.sentAt) : '-'}</dd>
                    <dt className="text-ink-faint">Attempts</dt>
                    <dd className="text-ink">{email.attempts}</dd>
                    <dt className="text-ink-faint">Rate-limit deferrals</dt>
                    <dd className="text-ink">{email.rateLimitedCount}</dd>
                    {email.error && (
                      <>
                        <dt className="text-ink-faint">Last error</dt>
                        <dd className="text-red-600">{email.error}</dd>
                      </>
                    )}
                    {email.previewUrl && (
                      <>
                        <dt className="text-ink-faint">Preview</dt>
                        <dd>
                          <a
                            href={email.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-brand hover:underline"
                          >
                            Open on Ethereal <ExternalLinkIcon size={12} />
                          </a>
                        </dd>
                      </>
                    )}
                  </dl>
                )}

                <div
                  className="email-body mt-6 text-[15px] leading-relaxed text-ink"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body) }}
                />

                {email.attachments.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-4">
                    {email.attachments.map((a) => {
                      const url = api.attachmentUrl(email.id, a.id);
                      return (
                        <AttachmentCard
                          key={a.id}
                          name={a.filename}
                          size={a.size}
                          href={url}
                          previewUrl={a.contentType.startsWith('image/') ? url : null}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="shrink-0 text-sm text-ink-soft">{formatDateTime(email.sentAt ?? email.scheduledAt)}</p>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

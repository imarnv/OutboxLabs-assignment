'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ClockIcon, SendIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCounts } from '@/context/CountsContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useEmailList } from '@/hooks/useEmailList';
import type { EmailTab } from '@/lib/types';
import { EmailRow } from './EmailRow';
import { EmailToolbar } from './EmailToolbar';

const EMPTY_COPY: Record<EmailTab, { title: string; description: string }> = {
  scheduled: {
    title: 'No scheduled emails',
    description: 'Emails you schedule will wait here until they are sent.',
  },
  sent: {
    title: 'No sent emails yet',
    description: 'Once scheduled emails go out, they will show up here with their delivery status.',
  },
};

function ListSkeleton() {
  return (
    <ul aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 border-b border-line px-6 py-4">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </li>
      ))}
    </ul>
  );
}

export function EmailListView({ tab }: { tab: EmailTab }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const { items, total, loading, loadingMore, error, hasMore, refresh, loadMore } = useEmailList(tab, debounced);
  const { refreshCounts } = useCounts();

  const onRefresh = () => {
    refreshCounts();
    void refresh();
  };

  let content;
  if (loading && items.length === 0) content = <ListSkeleton />;
  else if (error && items.length === 0) content = <ErrorState message={error} onRetry={onRefresh} />;
  else if (items.length === 0 && debounced)
    content = <EmptyState title="No matching emails" description={`Nothing in ${tab} matches “${debounced}”.`} />;
  else if (items.length === 0)
    content = (
      <EmptyState
        icon={tab === 'scheduled' ? <ClockIcon size={24} /> : <SendIcon size={24} />}
        {...EMPTY_COPY[tab]}
        action={
          tab === 'scheduled' ? (
            <Link href="/dashboard/compose">
              <Button variant="outline" size="sm">
                Compose new email
              </Button>
            </Link>
          ) : undefined
        }
      />
    );
  else
    content = (
      <>
        <ul>
          {items.map((email) => (
            <EmailRow key={email.id} email={email} />
          ))}
        </ul>
        {hasMore && (
          <div className="flex justify-center py-6">
            <Button variant="ghost" size="sm" loading={loadingMore} onClick={() => void loadMore()}>
              Load more ({items.length} of {total})
            </Button>
          </div>
        )}
      </>
    );

  return (
    <div className="flex h-full flex-col">
      <EmailToolbar query={query} onQueryChange={setQuery} onRefresh={onRefresh} refreshing={loading && items.length > 0} total={total} />
      <div className="flex-1 overflow-y-auto">{content}</div>
    </div>
  );
}

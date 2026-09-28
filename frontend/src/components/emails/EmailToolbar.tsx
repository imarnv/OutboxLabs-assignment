'use client';

import { RefreshIcon, SearchIcon, XIcon } from '@/components/icons';
import { IconButton } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export function EmailToolbar({
  query,
  onQueryChange,
  onRefresh,
  refreshing,
  total,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-6 py-4">
      <label className="flex h-10 flex-1 items-center gap-2 rounded-full bg-surface-muted px-4 text-ink-soft focus-within:ring-2 focus-within:ring-brand/30">
        <SearchIcon size={16} />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search"
          aria-label="Search emails"
          className="h-full flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')} className="hover:text-ink">
            <XIcon size={14} />
          </button>
        )}
      </label>
      <span className="px-2 text-xs text-ink-soft whitespace-nowrap">{total} email{total === 1 ? "" : "s"}</span>
      <IconButton label="Refresh" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? <Spinner size={16} /> : <RefreshIcon size={18} />}
      </IconButton>
    </div>
  );
}

'use client';

import clsx from 'clsx';
import { useState } from 'react';
import { CheckIcon, FilterIcon, RefreshIcon, SearchIcon, XIcon } from '@/components/icons';
import { IconButton } from '@/components/ui/Button';
import { Popover } from '@/components/ui/Popover';
import { Spinner } from '@/components/ui/Spinner';
import type { EmailStatus } from '@/lib/types';

export interface FilterOption {
  value: EmailStatus | undefined;
  label: string;
}

export function EmailToolbar({
  query,
  onQueryChange,
  filter,
  filterOptions,
  onFilterChange,
  onRefresh,
  refreshing,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  filter: EmailStatus | undefined;
  filterOptions: FilterOption[];
  onFilterChange: (f: EmailStatus | undefined) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-2">
      <label className="flex h-10 w-full max-w-[720px] items-center gap-2 rounded-full bg-surface-muted px-4 text-ink-faint focus-within:ring-2 focus-within:ring-brand/20">
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

      <div className="relative">
        <IconButton label="Filter" onClick={() => setFilterOpen((o) => !o)} className={clsx(filter && 'text-brand')}>
          <FilterIcon size={18} />
        </IconButton>
        <Popover open={filterOpen} onClose={() => setFilterOpen(false)} align="left" className="w-40 p-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                onFilterChange(opt.value);
                setFilterOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted"
            >
              {opt.label}
              {filter === opt.value && <CheckIcon size={14} className="text-brand" />}
            </button>
          ))}
        </Popover>
      </div>

      <IconButton label="Refresh" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? <Spinner size={16} /> : <RefreshIcon size={18} />}
      </IconButton>
    </div>
  );
}

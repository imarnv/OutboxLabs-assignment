'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { EmailListItem, EmailStatus, EmailTab } from '@/lib/types';

const PAGE_SIZE = 25;
const POLL_MS = 15_000;

interface EmailListState {
  items: EmailListItem[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useEmailList(tab: EmailTab, query: string, filter?: EmailStatus): EmailListState {
  const [items, setItems] = useState<EmailListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // refetch all loaded pages so a background refresh doesn't shrink the list
  const fetchPages = useCallback(
    async (pages: number, silent: boolean) => {
      const id = ++requestId.current;
      if (!silent) setLoading(true);
      try {
        const res = await api.listEmails(tab, { q: query || undefined, filter, page: 1, pageSize: PAGE_SIZE * pages });
        if (id !== requestId.current) return;
        setItems(res.items);
        setTotal(res.total);
        setError(null);
      } catch (err) {
        if (id === requestId.current) setError(err instanceof Error ? err.message : 'Failed to load emails');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [tab, query, filter],
  );

  useEffect(() => {
    setPage(1);
    setItems([]);
    void fetchPages(1, false);
  }, [fetchPages]);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void fetchPages(page, true);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [fetchPages, page]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await api.listEmails(tab, { q: query || undefined, filter, page: page + 1, pageSize: PAGE_SIZE });
      setItems((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...res.items.filter((e) => !seen.has(e.id))];
      });
      setTotal(res.total);
      setPage((p) => p + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more emails');
    } finally {
      setLoadingMore(false);
    }
  }, [tab, query, filter, page]);

  return {
    items,
    total,
    loading,
    loadingMore,
    error,
    hasMore: items.length < total,
    refresh: () => fetchPages(page, false),
    loadMore,
  };
}

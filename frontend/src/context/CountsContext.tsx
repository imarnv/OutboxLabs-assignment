'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { EmailCounts } from '@/lib/types';

interface CountsState {
  counts: EmailCounts | null;
  refreshCounts: () => void;
}

const CountsContext = createContext<CountsState | null>(null);

export function CountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<EmailCounts | null>(null);

  const refreshCounts = useCallback(() => {
    api.emailCounts().then(setCounts).catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshCounts();
    const t = setInterval(refreshCounts, 15_000);
    return () => clearInterval(t);
  }, [refreshCounts]);

  const value = useMemo(() => ({ counts, refreshCounts }), [counts, refreshCounts]);
  return <CountsContext.Provider value={value}>{children}</CountsContext.Provider>;
}

export function useCounts(): CountsState {
  const ctx = useContext(CountsContext);
  if (!ctx) throw new Error('useCounts must be used inside <CountsProvider>');
  return ctx;
}

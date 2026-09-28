'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { CountsProvider } from '@/context/CountsContext';
import { useToast } from '@/context/ToastContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slack = params.get('slack');
    if (!slack) return;
    if (slack === 'connected') toast.success('Slack connected! Rate-limit alerts will be posted to your channel.');
    else toast.error(params.get('message') ?? 'Could not connect Slack.');
    window.history.replaceState(null, '', window.location.pathname);
  }, [toast]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-brand">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <CountsProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col bg-white">{children}</main>
      </div>
    </CountsProvider>
  );
}

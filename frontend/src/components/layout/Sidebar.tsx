'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ClockIcon, ExternalLinkIcon, InboxIcon, SendIcon } from '@/components/icons';
import { useCounts } from '@/context/CountsContext';
import type { EmailTab } from '@/lib/types';
import { SlackConnect } from './SlackConnect';
import { UserMenu } from './UserMenu';

const BULL_BOARD_URL = process.env.NEXT_PUBLIC_BULL_BOARD_URL ?? 'http://localhost:4000/admin/queues';

const NAV: { tab: EmailTab; label: string; href: string; icon: ReactNode }[] = [
  { tab: 'scheduled', label: 'Scheduled', href: '/dashboard/scheduled', icon: <ClockIcon size={18} /> },
  { tab: 'sent', label: 'Sent', href: '/dashboard/sent', icon: <SendIcon size={18} /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const { counts } = useCounts();

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col gap-6 border-r border-line bg-white px-4 py-6">
      <Link href="/dashboard/scheduled" className="px-2 text-2xl font-extrabold tracking-tight text-ink">
        ONB
      </Link>

      <UserMenu />

      <Link
        href="/dashboard/compose"
        className="flex h-11 items-center justify-center rounded-full border border-brand text-sm font-medium text-brand transition hover:bg-brand-light"
      >
        Compose
      </Link>

      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-semibold tracking-wider text-ink-faint">CORE</p>
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.tab}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
                active ? 'bg-brand-light font-semibold text-ink' : 'text-ink-soft hover:bg-surface-muted',
              )}
            >
              <span className={active ? 'text-ink' : 'text-ink-soft'}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <span className="text-xs text-ink-soft">{counts ? counts[item.tab] : ''}</span>
            </Link>
          );
        })}
        <a
          href={BULL_BOARD_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-soft transition hover:bg-surface-muted"
        >
          <InboxIcon size={18} />
          <span className="flex-1">Queue dashboard</span>
          <ExternalLinkIcon size={14} className="text-ink-faint" />
        </a>
      </nav>

      <div className="mt-auto">
        <SlackConnect />
      </div>
    </aside>
  );
}

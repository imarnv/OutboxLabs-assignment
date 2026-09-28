'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ClockIcon, SendIcon } from '@/components/icons';
import { useCounts } from '@/context/CountsContext';
import type { EmailTab } from '@/lib/types';
import { UserMenu } from './UserMenu';

const NAV: { tab: EmailTab; label: string; href: string; icon: ReactNode }[] = [
  { tab: 'scheduled', label: 'Scheduled', href: '/dashboard/scheduled', icon: <ClockIcon size={16} /> },
  { tab: 'sent', label: 'Sent', href: '/dashboard/sent', icon: <SendIcon size={16} /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const { counts } = useCounts();

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col gap-3 bg-white px-3 py-4">
      <Link href="/dashboard/scheduled" className="px-2 font-pixel text-[34px] leading-none text-ink">
        ONB
      </Link>

      <UserMenu />

      <Link
        href="/dashboard/compose"
        className="flex h-9 items-center justify-center rounded-full border border-brand text-sm text-brand transition hover:bg-brand-light"
      >
        Compose
      </Link>

      <nav className="mt-3 flex flex-col gap-0.5">
        <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-ink-faint">Core</p>
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.tab}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                active ? 'bg-brand-light font-semibold text-ink' : 'text-ink hover:bg-surface-muted',
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              <span className="text-xs font-normal text-ink-soft">{counts ? counts[item.tab] : ''}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

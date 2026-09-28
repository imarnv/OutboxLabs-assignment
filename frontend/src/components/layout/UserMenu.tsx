'use client';

import { useState } from 'react';
import { ChevronDownIcon, ExternalLinkIcon, InboxIcon, LogOutIcon } from '@/components/icons';
import { Avatar } from '@/components/ui/Avatar';
import { Popover } from '@/components/ui/Popover';
import { useAuth } from '@/context/AuthContext';
import { SlackConnect } from './SlackConnect';

const BULL_BOARD_URL = process.env.NEXT_PUBLIC_BULL_BOARD_URL ?? 'http://localhost:4000/admin/queues';

const itemClass = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-muted';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-xl bg-surface-muted px-2.5 py-2 text-left transition hover:bg-line/60"
      >
        <Avatar name={user.name} src={user.avatarUrl} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink">{user.name}</span>
          <span className="block truncate text-[11px] text-ink-soft">{user.email}</span>
        </span>
        <ChevronDownIcon size={16} className={open ? 'rotate-180 text-ink-faint transition' : 'text-ink-faint transition'} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="left" className="w-[260px] p-1.5">
        <div className="p-1.5">
          <SlackConnect />
        </div>
        <a href={BULL_BOARD_URL} target="_blank" rel="noreferrer" className={itemClass}>
          <InboxIcon size={16} />
          <span className="flex-1">Queue dashboard</span>
          <ExternalLinkIcon size={14} className="text-ink-faint" />
        </a>
        <button type="button" onClick={() => void logout()} className={itemClass}>
          <LogOutIcon size={16} />
          Logout
        </button>
      </Popover>
    </div>
  );
}

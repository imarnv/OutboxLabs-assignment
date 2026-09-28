'use client';

import { useState } from 'react';
import { ChevronDownIcon, LogOutIcon } from '@/components/icons';
import { Avatar } from '@/components/ui/Avatar';
import { Popover } from '@/components/ui/Popover';
import { useAuth } from '@/context/AuthContext';

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
        className="flex w-full items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5 text-left transition hover:bg-line/70"
      >
        <Avatar name={user.name} src={user.avatarUrl} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
          <span className="block truncate text-xs text-ink-soft">{user.email}</span>
        </span>
        <ChevronDownIcon size={16} className={open ? 'rotate-180 text-ink-soft transition' : 'text-ink-soft transition'} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="left" className="w-full p-1.5">
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-muted"
        >
          <LogOutIcon size={16} />
          Logout
        </button>
      </Popover>
    </div>
  );
}

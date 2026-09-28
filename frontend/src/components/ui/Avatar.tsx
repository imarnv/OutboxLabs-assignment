'use client';

import clsx from 'clsx';
import { useState } from 'react';
import { initials } from '@/lib/format';

const COLORS = ['bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700', 'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700'];

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const color = COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={clsx('shrink-0 rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-label={name}
      className={clsx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', color, className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name) || '?'}
    </span>
  );
}

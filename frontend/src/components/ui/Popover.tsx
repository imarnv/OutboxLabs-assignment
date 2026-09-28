'use client';

import clsx from 'clsx';
import { useRef, type ReactNode } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

export function Popover({
  open,
  onClose,
  children,
  className,
  align = 'right',
  placement = 'bottom',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
  placement?: 'top' | 'bottom';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose, open);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      className={clsx(
        'absolute z-30 rounded-xl border border-line bg-white shadow-pop',
        align === 'right' ? 'right-0' : 'left-0',
        placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

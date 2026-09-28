'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Popover } from '@/components/ui/Popover';
import { toLocalInputValue } from '@/lib/format';

interface Preset {
  label: string;
  at: () => Date;
}

function tomorrowAt(hours?: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if (hours !== undefined) d.setHours(hours, 0, 0, 0);
  return d;
}

const PRESETS: Preset[] = [
  { label: 'Tomorrow', at: () => tomorrowAt() },
  { label: 'Tomorrow, 10:00 AM', at: () => tomorrowAt(10) },
  { label: 'Tomorrow, 11:00 AM', at: () => tomorrowAt(11) },
  { label: 'Tomorrow, 3:00 PM', at: () => tomorrowAt(15) },
];

export function SendLaterPopover({
  open,
  onClose,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (start: Date) => void;
  submitting: boolean;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(toLocalInputValue(new Date(Date.now() + 60_000)));
      setError(null);
    }
  }, [open]);

  const confirm = () => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return setError('Pick a valid date & time');
    if (d.getTime() < Date.now() - 60_000) return setError('Start time is in the past');
    onConfirm(d);
  };

  return (
    <Popover open={open} onClose={onClose} placement="bottom" className="w-[320px] p-5">
      <h3 className="mb-3 text-base font-semibold text-ink">Send Later</h3>
      <input
        type="datetime-local"
        aria-label="Pick date & time"
        value={value}
        min={toLocalInputValue(new Date())}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        className={clsx(
          'h-10 w-full rounded-lg border px-3 text-sm text-ink outline-none focus:border-brand',
          error ? 'border-red-300' : 'border-line',
        )}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : <p className="mt-1 text-xs text-ink-faint">Pick date & time</p>}

      <ul className="my-3 flex flex-col">
        {PRESETS.map((p) => (
          <li key={p.label}>
            <button
              type="button"
              onClick={() => {
                setValue(toLocalInputValue(p.at()));
                setError(null);
              }}
              className="w-full rounded-md px-1 py-2 text-left text-sm text-ink hover:bg-surface-muted"
            >
              {p.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="outline" size="sm" onClick={confirm} loading={submitting}>
          Done
        </Button>
      </div>
    </Popover>
  );
}

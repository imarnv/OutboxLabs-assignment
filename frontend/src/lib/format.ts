const WEEKDAY_TIME = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
});
const FULL = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const DATE_TIME = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const SHORT_DATE =new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

/** "Tue 9:21:47 AM" within the coming week, otherwise "Oct 12, 9:21 AM". */
export function formatChipTime(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.abs(d.getTime() - Date.now()) / 86_400_000;
  if (diffDays < 6) return WEEKDAY_TIME.format(d);
  return `${SHORT_DATE.format(d)}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function formatFull(iso: string): string {
  return FULL.format(new Date(iso));
}

/** "Nov 3, 10:23 AM" */
export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

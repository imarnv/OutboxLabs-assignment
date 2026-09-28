import { PaperclipIcon, XIcon } from '@/components/icons';
import { formatBytes } from '@/lib/format';

export function AttachmentCard({
  name,
  size,
  previewUrl,
  href,
  onRemove,
}: {
  name: string;
  size: number;
  previewUrl?: string | null;
  href?: string;
  onRemove?: () => void;
}) {
  const card = (
    <div className="group relative w-[210px] overflow-hidden rounded-xl bg-surface">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={name} className="h-[118px] w-full object-cover" />
      ) : (
        <div className="flex h-[118px] items-center justify-center bg-surface-muted text-ink-faint">
          <PaperclipIcon size={28} />
        </div>
      )}
      <div className="px-2.5 py-2">
        <p className="truncate text-sm text-ink">{name}</p>
        <p className="text-xs text-ink-faint">{formatBytes(size)}</p>
      </div>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink shadow group-hover:flex"
        >
          <XIcon size={12} />
        </button>
      )}
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer">
      {card}
    </a>
  ) : (
    card
  );
}

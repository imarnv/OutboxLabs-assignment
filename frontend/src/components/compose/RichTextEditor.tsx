'use client';

import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  RedoIcon,
  StrikeIcon,
  TypeIcon,
  UnderlineIcon,
  UndoIcon,
} from '@/components/icons';

type Command = { cmd: string; arg?: string; label: string; icon: ReactNode };

const GROUPS: Command[][] = [
  [
    { cmd: 'undo', label: 'Undo', icon: <UndoIcon size={16} /> },
    { cmd: 'redo', label: 'Redo', icon: <RedoIcon size={16} /> },
  ],
  [
    { cmd: 'formatBlock', arg: 'P', label: 'Normal text', icon: <TypeIcon size={16} /> },
    { cmd: 'bold', label: 'Bold', icon: <BoldIcon size={16} /> },
    { cmd: 'italic', label: 'Italic', icon: <ItalicIcon size={16} /> },
    { cmd: 'underline', label: 'Underline', icon: <UnderlineIcon size={16} /> },
    { cmd: 'strikeThrough', label: 'Strikethrough', icon: <StrikeIcon size={16} /> },
  ],
  [
    { cmd: 'justifyLeft', label: 'Align left', icon: <AlignLeftIcon size={16} /> },
    { cmd: 'justifyCenter', label: 'Align center', icon: <AlignCenterIcon size={16} /> },
    { cmd: 'justifyRight', label: 'Align right', icon: <AlignRightIcon size={16} /> },
  ],
  [
    { cmd: 'insertUnorderedList', label: 'Bulleted list', icon: <ListIcon size={16} /> },
    { cmd: 'insertOrderedList', label: 'Numbered list', icon: <ListOrderedIcon size={16} /> },
    { cmd: 'formatBlock', arg: 'BLOCKQUOTE', label: 'Quote', icon: <QuoteIcon size={16} /> },
  ],
];

// execCommand is deprecated but still supported everywhere, and avoids pulling in an editor library.
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  invalid,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // only sync from props when it actually differs, otherwise the caret jumps
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);

  const exec = (c: Command) => {
    ref.current?.focus();
    document.execCommand(c.cmd, false, c.arg);
    emit();
  };

  const emit = () => {
    const html = ref.current?.innerHTML ?? '';
    const empty = !ref.current?.textContent?.trim() && !/<(img|li)/i.test(html);
    if (empty && ref.current) ref.current.innerHTML = '';
    onChange(empty ? '' : html);
  };

  return (
    <div className={clsx('overflow-hidden rounded-xl bg-surface', invalid && 'ring-2 ring-red-200')}>
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1 border-b border-line bg-surface-muted px-3 py-2">
        {GROUPS.map((group, gi) => (
          <div key={gi} className={clsx('flex items-center gap-0.5', gi > 0 && 'border-l border-line pl-1.5')}>
            {group.map((c) => (
              <button
                key={c.label}
                type="button"
                title={c.label}
                aria-label={c.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec(c)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition hover:bg-white hover:text-ink"
              >
                {c.icon}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        className="rte min-h-[260px] px-5 py-4 text-sm leading-relaxed text-ink outline-none"
      />
    </div>
  );
}

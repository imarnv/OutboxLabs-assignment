'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ChevronsUpDownIcon,
  IndentIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  OutdentIcon,
  ParagraphIcon,
  QuoteIcon,
  RedoIcon,
  StrikeIcon,
  TypeIcon,
  UnderlineIcon,
  UndoIcon,
} from '@/components/icons';
import { Popover } from '@/components/ui/Popover';

type Command = { cmd: string; arg?: string; label: string; icon: ReactNode };

const FONT_SIZES = [
  { label: 'Small', arg: '2' },
  { label: 'Normal', arg: '3' },
  { label: 'Large', arg: '5' },
  { label: 'Huge', arg: '6' },
];

const ALIGNMENTS: Command[] = [
  { cmd: 'justifyLeft', label: 'Left', icon: <AlignLeftIcon size={16} /> },
  { cmd: 'justifyCenter', label: 'Center', icon: <AlignCenterIcon size={16} /> },
  { cmd: 'justifyRight', label: 'Right', icon: <AlignRightIcon size={16} /> },
];

const HISTORY: Command[] = [
  { cmd: 'undo', label: 'Undo', icon: <UndoIcon size={18} /> },
  { cmd: 'redo', label: 'Redo', icon: <RedoIcon size={18} /> },
];

const INLINE: Command[] = [
  { cmd: 'bold', label: 'Bold', icon: <BoldIcon size={18} /> },
  { cmd: 'italic', label: 'Italic', icon: <ItalicIcon size={18} /> },
  { cmd: 'underline', label: 'Underline', icon: <UnderlineIcon size={18} /> },
];

const BLOCKS: Command[] = [
  { cmd: 'insertOrderedList', label: 'Numbered list', icon: <ListOrderedIcon size={18} /> },
  { cmd: 'insertUnorderedList', label: 'Bulleted list', icon: <ListIcon size={18} /> },
  { cmd: 'indent', label: 'Indent', icon: <IndentIcon size={18} /> },
  { cmd: 'outdent', label: 'Outdent', icon: <OutdentIcon size={18} /> },
  { cmd: 'formatBlock', arg: 'BLOCKQUOTE', label: 'Quote', icon: <QuoteIcon size={18} /> },
  { cmd: 'formatBlock', arg: 'P', label: 'Paragraph', icon: <ParagraphIcon size={18} /> },
];

const STRIKE: Command = { cmd: 'strikeThrough', label: 'Strikethrough', icon: <StrikeIcon size={18} /> };

const toolClass =
  'inline-flex h-8 min-w-8 items-center justify-center gap-0.5 rounded-md px-1 text-ink-soft transition hover:bg-surface-muted hover:text-ink';

function Divider() {
  return <span className="mx-1.5 h-5 w-px bg-line" />;
}

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
  const [menu, setMenu] = useState<'size' | 'align' | null>(null);
  const [align, setAlign] = useState(ALIGNMENTS[1]);

  // only sync from props when it actually differs, otherwise the caret jumps
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const empty = !el.textContent?.trim() && !/<(img|li)/i.test(el.innerHTML);
    if (empty) el.innerHTML = '';
    onChange(empty ? '' : el.innerHTML);
  };

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const tool = (c: Command) => (
    <button
      key={c.label}
      type="button"
      title={c.label}
      aria-label={c.label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => exec(c.cmd, c.arg)}
      className={toolClass}
    >
      {c.icon}
    </button>
  );

  return (
    <div
      className={clsx('flex min-h-[470px] flex-col rounded-xl bg-surface p-4', invalid && 'ring-2 ring-red-200')}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.focus();
      }}
    >
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        className="rte min-h-6 px-1 text-sm leading-relaxed text-ink outline-none"
      />

      <div role="toolbar" aria-label="Formatting" className="mt-3 flex flex-wrap items-center rounded-full bg-white px-3 py-1">
        {HISTORY.map(tool)}
        <Divider />

        <div className="relative">
          <button
            type="button"
            title="Font size"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMenu(menu === 'size' ? null : 'size')}
            className={toolClass}
          >
            <TypeIcon size={20} />
            <ChevronsUpDownIcon size={10} />
          </button>
          <Popover open={menu === 'size'} onClose={() => setMenu(null)} align="left" className="w-32 p-1">
            {FONT_SIZES.map((s) => (
              <button
                key={s.arg}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  exec('fontSize', s.arg);
                  setMenu(null);
                }}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-ink hover:bg-surface-muted"
              >
                {s.label}
              </button>
            ))}
          </Popover>
        </div>
        <Divider />

        {INLINE.map(tool)}
        <Divider />

        <div className="relative flex items-center">
          <button
            type="button"
            title={`Align ${align.label.toLowerCase()}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(align.cmd)}
            className={toolClass}
          >
            {align.icon}
          </button>
          <button
            type="button"
            title="Alignment"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMenu(menu === 'align' ? null : 'align')}
            className={toolClass}
          >
            <ChevronsUpDownIcon size={16} />
          </button>
          <Popover open={menu === 'align'} onClose={() => setMenu(null)} align="left" className="w-32 p-1">
            {ALIGNMENTS.map((a) => (
              <button
                key={a.cmd}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setAlign(a);
                  exec(a.cmd);
                  setMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-ink hover:bg-surface-muted"
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </Popover>
        </div>
        <Divider />

        {BLOCKS.map(tool)}
        <Divider />

        {tool(STRIKE)}
      </div>

      <div className="flex-1 cursor-text" onClick={() => ref.current?.focus()} />
    </div>
  );
}

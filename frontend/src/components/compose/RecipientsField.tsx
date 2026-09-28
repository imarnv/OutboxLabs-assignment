'use client';

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { UploadIcon, XIcon } from '@/components/icons';
import { useToast } from '@/context/ToastContext';
import { isValidEmail, parseLeads } from '@/lib/parseLeads';

const VISIBLE_CHIPS = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function RecipientsField({ value, onChange }: { value: string[]; onChange: (emails: string[]) => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const merge = (incoming: string[]) => {
    const set = new Set(value);
    const added = incoming.filter((e) => !set.has(e) && set.add(e));
    onChange([...value, ...added]);
    return added.length;
  };

  const commitDraft = () => {
    const parts = draft.split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) return;
    const invalid = parts.filter((p) => !isValidEmail(p));
    merge(parts.filter(isValidEmail).map((p) => p.toLowerCase()));
    setDraft(invalid.join(' '));
    if (invalid.length) toast.error(`Not a valid email: ${invalid[0]}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ';', 'Tab'].includes(e.key) && draft.trim()) {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const { emails } = parseLeads(text);
    if (emails.length > 1) {
      e.preventDefault();
      const added = merge(emails);
      toast.success(`Added ${added} email address${added === 1 ? '' : 'es'} from clipboard.`);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File is too large (max 5 MB).');
      return;
    }
    const { emails, duplicates } = parseLeads(await file.text());
    if (!emails.length) {
      toast.error(`No email addresses found in ${file.name}.`);
      return;
    }
    const added = merge(emails);
    setFileName(file.name);
    toast.success(
      `${emails.length} email address${emails.length === 1 ? '' : 'es'} detected in ${file.name}` +
        (duplicates ? ` (${duplicates} duplicate${duplicates === 1 ? '' : 's'} skipped)` : '') +
        (added < emails.length ? `, ${added} new` : ''),
    );
    if (fileRef.current) fileRef.current.value = '';
  };

  const shown = expanded ? value : value.slice(0, VISIBLE_CHIPS);
  const hidden = value.length - shown.length;

  return (
    <div className="flex items-start gap-3">
      <div className="flex min-h-8 flex-1 flex-wrap items-center gap-1.5">
        {shown.map((email) => (
          <span key={email} className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-white px-2.5 py-1 text-xs text-ink">
            {email}
            <button type="button" aria-label={`Remove ${email}`} onClick={() => onChange(value.filter((v) => v !== email))} className="text-ink-faint hover:text-ink">
              <XIcon size={12} />
            </button>
          </span>
        ))}
        {hidden > 0 && (
          <button type="button" onClick={() => setExpanded(true)} className="rounded-full bg-brand-light px-2.5 py-1 text-xs font-medium text-brand">
            +{hidden}
          </button>
        )}
        {expanded && value.length > VISIBLE_CHIPS && (
          <button type="button" onClick={() => setExpanded(false)} className="px-1 text-xs text-ink-soft hover:underline">
            Show less
          </button>
        )}
        <input
          id="recipients"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commitDraft}
          onPaste={onPaste}
          placeholder={value.length ? '' : 'recipient@example.com'}
          className="min-w-[160px] flex-1 bg-transparent py-1 text-sm text-ink placeholder:text-ink-faint outline-none"
        />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-brand hover:underline">
          <UploadIcon size={16} />
          Upload List
        </button>
        {value.length > 0 && (
          <span className="text-xs text-ink-soft" title={fileName ?? undefined}>
            {value.length} email{value.length === 1 ? '' : 's'} detected
          </span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FormRow } from '@/components/compose/FormRow';
import { RecipientsField } from '@/components/compose/RecipientsField';
import { RichTextEditor } from '@/components/compose/RichTextEditor';
import { SendLaterPopover } from '@/components/compose/SendLaterPopover';
import { AttachmentCard } from '@/components/emails/AttachmentCard';
import { ArrowLeftIcon, ChevronDownIcon, ClockIcon, PaperclipIcon } from '@/components/icons';
import { Button, IconButton } from '@/components/ui/Button';
import { BareInput, BoxInput } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCounts } from '@/context/CountsContext';
import { useToast } from '@/context/ToastContext';
import { useAsync } from '@/hooks/useAsync';
import { useAttachments } from '@/hooks/useAttachments';
import { api } from '@/lib/api';
import { formatChipTime } from '@/lib/format';

interface FormState {
  senderId: number | null;
  recipients: string[];
  subject: string;
  body: string;
  delaySeconds: string;
  hourlyLimit: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.senderId) e.senderId = 'Choose a sender';
  if (!f.recipients.length) e.recipients = 'Add recipients or upload a list';
  if (!f.subject.trim()) e.subject = 'Subject is required';
  if (!f.body.trim()) e.body = 'Write a message';
  const delay = Number(f.delaySeconds || 0);
  if (!Number.isInteger(delay) || delay < 0) e.delaySeconds = 'Delay must be a whole number of seconds';
  const limit = Number(f.hourlyLimit);
  if (!f.hourlyLimit || !Number.isInteger(limit) || limit < 1) e.hourlyLimit = 'Set an hourly limit of at least 1';
  return e;
}

export default function ComposePage() {
  const router = useRouter();
  const toast = useToast();
  const { refreshCounts } = useCounts();
  const { data: senderData, loading: sendersLoading, error: sendersError } = useAsync(() => api.senders(), []);
  const attachments = useAttachments(toast.error);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    senderId: null,
    recipients: [],
    subject: '',
    body: '',
    delaySeconds: '',
    hourlyLimit: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sendLaterOpen, setSendLaterOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!senderData) return;
    setForm((f) => ({ ...f, senderId: f.senderId ?? senderData.senders[0]?.id ?? null }));
  }, [senderData]);

  useEffect(() => {
    if (sendersError) toast.error(sendersError);
  }, [sendersError, toast]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const openSendLater = () => {
    const e = validate(form);
    setErrors(e);
    const first = Object.values(e)[0];
    if (first) {
      toast.error(first);
      return;
    }
    setSendLaterOpen(true);
  };

  const schedule = async (start: Date) => {
    setSubmitting(true);
    try {
      const res = await api.schedule({
        senderId: form.senderId!,
        subject: form.subject.trim(),
        body: form.body,
        recipients: form.recipients,
        startTime: start.toISOString(),
        delayBetweenSeconds: Number(form.delaySeconds || 0),
        hourlyLimit: Number(form.hourlyLimit),
        attachments: await attachments.serialize(),
      });
      toast.success(
        `Scheduled ${res.scheduled} email${res.scheduled === 1 ? '' : 's'}` +
          (res.firstScheduledAt ? `, first at ${formatChipTime(res.firstScheduledAt)}` : '') +
          (res.lastScheduledAt && res.scheduled > 1 ? `, last at ${formatChipTime(res.lastScheduledAt)}` : '') +
          '.',
      );
      refreshCounts();
      router.push('/dashboard/scheduled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not schedule emails');
    } finally {
      setSubmitting(false);
    }
  };

  const maxPerSender = senderData?.limits.maxEmailsPerHourPerSender;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-4 py-4">
        <IconButton label="Back" onClick={() => router.back()}>
          <ArrowLeftIcon size={20} />
        </IconButton>
        <h1 className="text-[22px] text-ink">Compose New Email</h1>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Attach files" className="relative" onClick={() => fileRef.current?.click()}>
            <PaperclipIcon size={20} className="text-brand" />
            {attachments.items.length > 0 && (
              <span className="absolute bottom-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-surface-muted px-0.5 text-[9px] text-ink-soft">
                {attachments.items.length}
              </span>
            )}
          </IconButton>
          <IconButton label="Pick send time" onClick={openSendLater}>
            <ClockIcon size={20} className="text-brand" />
          </IconButton>
          <div className="relative ml-2">
            <Button variant="outline" size="sm" className="h-9 px-4" onClick={openSendLater} loading={submitting}>
              Send Later
            </Button>
            <SendLaterPopover
              open={sendLaterOpen}
              onClose={() => setSendLaterOpen(false)}
              onConfirm={(d) => void schedule(d)}
              submitting={submitting}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              attachments.add(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        <div className="mx-auto max-w-[1040px] pt-2">
          <FormRow label="From" htmlFor="sender" underline={false}>
            {sendersLoading ? (
              <Skeleton className="h-10 w-64 rounded-lg" />
            ) : (
              <div className="relative -ml-2 -my-2 inline-flex">
                <select
                  id="sender"
                  value={form.senderId ?? ''}
                  onChange={(e) => set('senderId', Number(e.target.value))}
                  className="h-10 appearance-none rounded-lg bg-surface-muted pl-3 pr-9 text-[15px] text-ink outline-none focus:ring-2 focus:ring-brand/20"
                >
                  {!senderData?.senders.length && <option value="">No senders available</option>}
                  {senderData?.senders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.email}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              </div>
            )}
          </FormRow>

          <FormRow label="To" htmlFor="recipients" invalid={Boolean(errors.recipients)}>
            <RecipientsField value={form.recipients} onChange={(v) => set('recipients', v)} />
          </FormRow>

          <FormRow label="Subject" htmlFor="subject" invalid={Boolean(errors.subject)}>
            <BareInput
              id="subject"
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="Subject"
              maxLength={500}
              className="text-[15px]"
            />
          </FormRow>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 py-3">
            <label className="flex items-center gap-3 text-sm text-ink" title="Seconds between two emails">
              Delay between 2 emails
              <BoxInput
                type="number"
                min={0}
                inputMode="numeric"
                value={form.delaySeconds}
                onChange={(e) => set('delaySeconds', e.target.value)}
                placeholder="00"
                aria-label="Delay between 2 emails in seconds"
                aria-invalid={Boolean(errors.delaySeconds)}
                className={errors.delaySeconds ? 'border-red-300' : undefined}
              />
            </label>
            <label
              className="flex items-center gap-1.5 text-sm text-ink"
              title={maxPerSender ? `The server also caps each sender at ${maxPerSender}/hour` : undefined}
            >
              Hourly Limit
              <BoxInput
                type="number"
                min={1}
                inputMode="numeric"
                value={form.hourlyLimit}
                onChange={(e) => set('hourlyLimit', e.target.value)}
                placeholder="00"
                aria-invalid={Boolean(errors.hourlyLimit)}
                className={errors.hourlyLimit ? 'border-red-300' : undefined}
              />
            </label>
          </div>

          <div className="pt-2">
            <RichTextEditor
              value={form.body}
              onChange={(html) => set('body', html)}
              placeholder="Type Your Reply..."
              invalid={Boolean(errors.body)}
            />
          </div>

          {attachments.items.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {attachments.items.map((a) => (
                <AttachmentCard
                  key={a.id}
                  name={a.file.name}
                  size={a.file.size}
                  previewUrl={a.previewUrl}
                  onRemove={() => attachments.remove(a.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

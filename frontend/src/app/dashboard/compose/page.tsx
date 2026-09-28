'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormRow } from '@/components/compose/FormRow';
import { RecipientsField } from '@/components/compose/RecipientsField';
import { RichTextEditor } from '@/components/compose/RichTextEditor';
import { SendLaterPopover } from '@/components/compose/SendLaterPopover';
import { ArrowLeftIcon, ChevronDownIcon, ClockIcon, PaperclipIcon } from '@/components/icons';
import { Button, IconButton } from '@/components/ui/Button';
import { BareInput, BoxInput } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCounts } from '@/context/CountsContext';
import { useToast } from '@/context/ToastContext';
import { useAsync } from '@/hooks/useAsync';
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
  const delay = Number(f.delaySeconds);
  if (!Number.isInteger(delay) || delay < 0) e.delaySeconds = 'Delay must be a whole number ≥ 0';
  const limit = Number(f.hourlyLimit);
  if (!Number.isInteger(limit) || limit < 1) e.hourlyLimit = 'Hourly limit must be ≥ 1';
  return e;
}

export default function ComposePage() {
  const router = useRouter();
  const toast = useToast();
  const { refreshCounts } = useCounts();
  const { data: senderData, loading: sendersLoading, error: sendersError } = useAsync(() => api.senders(), []);

  const [form, setForm] = useState<FormState>({
    senderId: null,
    recipients: [],
    subject: '',
    body: '',
    delaySeconds: '5',
    hourlyLimit: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sendLaterOpen, setSendLaterOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!senderData) return;
    setForm((f) => ({
      ...f,
      senderId: f.senderId ?? senderData.senders[0]?.id ?? null,
      hourlyLimit: f.hourlyLimit || String(senderData.limits.maxEmailsPerHourPerSender),
    }));
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
        delayBetweenSeconds: Number(form.delaySeconds),
        hourlyLimit: Number(form.hourlyLimit),
      });
      toast.success(
        `Scheduled ${res.scheduled} email${res.scheduled === 1 ? '' : 's'}` +
          (res.firstScheduledAt ? ` starting ${formatChipTime(res.firstScheduledAt)}` : '') +
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

  const limits = senderData?.limits;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-6 py-4">
        <IconButton label="Back" onClick={() => router.back()}>
          <ArrowLeftIcon size={20} />
        </IconButton>
        <h1 className="text-lg font-semibold text-ink">Compose New Email</h1>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Attachments are not supported yet" disabled>
            <PaperclipIcon size={18} />
          </IconButton>
          <IconButton label="Schedule" onClick={openSendLater}>
            <ClockIcon size={18} />
          </IconButton>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white px-6 pb-6 sm:border sm:border-line sm:shadow-card">
          <FormRow label="From" htmlFor="sender">
            {sendersLoading ? (
              <Skeleton className="h-8 w-64 rounded-md" />
            ) : (
              <div className="relative inline-flex">
                <select
                  id="sender"
                  value={form.senderId ?? ''}
                  onChange={(e) => set('senderId', Number(e.target.value))}
                  className="h-8 appearance-none rounded-md bg-surface-muted pl-3 pr-9 text-sm text-ink outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {!senderData?.senders.length && <option value="">No senders available</option>}
                  {senderData?.senders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} &lt;{s.email}&gt;
                    </option>
                  ))}
                </select>
                <ChevronDownIcon size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              </div>
            )}
          </FormRow>

          <FormRow label="To" htmlFor="recipients" className={errors.recipients ? 'bg-red-50/40' : undefined}>
            <RecipientsField value={form.recipients} onChange={(v) => set('recipients', v)} />
          </FormRow>

          <FormRow label="Subject" htmlFor="subject" className={errors.subject ? 'bg-red-50/40' : undefined}>
            <BareInput id="subject" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Subject" maxLength={500} />
          </FormRow>

          <div className="flex flex-wrap items-center gap-x-10 gap-y-3 border-b border-line py-3">
            <label className="flex items-center gap-3 text-sm text-ink-soft">
              Delay between 2 emails
              <BoxInput
                type="number"
                min={0}
                inputMode="numeric"
                value={form.delaySeconds}
                onChange={(e) => set('delaySeconds', e.target.value)}
                placeholder="00"
                aria-invalid={Boolean(errors.delaySeconds)}
                className={errors.delaySeconds ? 'border-red-300' : undefined}
              />
              <span className="text-xs text-ink-faint">sec</span>
            </label>
            <label className="flex items-center gap-3 text-sm text-ink-soft">
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
            {limits && (
              <p className="text-xs text-ink-faint">
                Server caps: {limits.maxEmailsPerHourPerSender}/hr per sender · min {limits.minDelayBetweenSendsMs / 1000}s between
                sends
              </p>
            )}
          </div>

          <div className="pt-5">
            <RichTextEditor value={form.body} onChange={(html) => set('body', html)} placeholder="Type your reply..." invalid={Boolean(errors.body)} />
          </div>

          <div className="mt-6 flex justify-end">
            <div className="relative">
              <Button variant="outline" size="lg" className="min-w-[160px]" onClick={openSendLater} loading={submitting}>
                Send Later
              </Button>
              <SendLaterPopover open={sendLaterOpen} onClose={() => setSendLaterOpen(false)} onConfirm={(d) => void schedule(d)} submitting={submitting} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

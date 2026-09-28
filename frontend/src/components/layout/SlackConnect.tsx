'use client';

import { useState } from 'react';
import { SlackIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/context/ToastContext';
import { useAsync } from '@/hooks/useAsync';
import { api, oauthUrls } from '@/lib/api';

export function SlackConnect() {
  const toast = useToast();
  const { data: status, loading, reload } = useAsync(() => api.slackStatus(), []);
  const [busy, setBusy] = useState<'test' | 'disconnect' | null>(null);

  if (loading && !status) return <Skeleton className="h-[74px] w-full rounded-xl" />;
  if (!status) return null;

  const run = async (kind: 'test' | 'disconnect') => {
    setBusy(kind);
    try {
      if (kind === 'test') {
        await api.slackTest();
        toast.success('Test message sent to Slack.');
      } else {
        await api.slackDisconnect();
        toast.info('Slack disconnected.');
        await reload();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Slack request failed');
      await reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-2 flex items-center gap-2">
        <SlackIcon size={16} />
        <span className="text-sm font-medium text-ink">Slack alerts</span>
        {status.connected && <span className="ml-auto h-2 w-2 rounded-full bg-brand" title="Connected" />}
      </div>
      {status.connected ? (
        <>
          <p className="mb-2 truncate text-xs text-ink-soft" title={`${status.teamName ?? ''} ${status.channel ?? ''}`}>
            {status.teamName} · {status.channel}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="flex-1 border border-line" loading={busy === 'test'} onClick={() => run('test')}>
              Test
            </Button>
            <Button size="sm" variant="danger" className="flex-1" loading={busy === 'disconnect'} onClick={() => run('disconnect')}>
              Disconnect
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-2 text-xs text-ink-soft">Get notified when a sender hits its hourly limit.</p>
          <Button
            size="sm"
            variant="outline"
            fullWidth
            disabled={!status.configured}
            title={status.configured ? undefined : 'Set SLACK_CLIENT_ID / SLACK_CLIENT_SECRET on the backend'}
            onClick={() => {
              window.location.href = oauthUrls.slackConnect;
            }}
          >
            Connect Slack
          </Button>
        </>
      )}
    </div>
  );
}

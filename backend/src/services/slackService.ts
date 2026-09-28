import crypto from 'node:crypto';
import { config } from '../config';
import { query, queryOne } from '../db/pool';
import { errMsg, logger } from '../lib/logger';
import { redis } from '../lib/redis';
import type { SlackConnectionRow } from '../types';

const STATE_TTL_SECONDS = 600;

export function slackRedirectUri(): string {
  return process.env.SLACK_REDIRECT_URI || `${config.publicApiUrl}/api/slack/callback`;
}

export function isSlackConfigured(): boolean {
  return Boolean(config.slack.clientId && config.slack.clientSecret);
}

export async function buildAuthorizeUrl(userId: number): Promise<string> {
  const state = crypto.randomBytes(24).toString('hex');
  await redis.set(`slack:oauth:state:${state}`, String(userId), 'EX', STATE_TTL_SECONDS);
  const params = new URLSearchParams({
    client_id: config.slack.clientId,
    scope: 'incoming-webhook,chat:write',
    redirect_uri: slackRedirectUri(),
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  team?: { id: string; name: string };
  incoming_webhook?: { channel: string; channel_id: string; url: string };
}

export async function completeOAuth(code: string, state: string): Promise<number> {
  const stateKey = `slack:oauth:state:${state}`;
  const userId = await redis.get(stateKey);
  if (!userId) throw new Error('Slack OAuth state is invalid or expired. Please try connecting again.');
  await redis.del(stateKey);

  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.slack.clientId,
      client_secret: config.slack.clientSecret,
      code,
      redirect_uri: slackRedirectUri(),
    }),
  });
  const data = (await res.json()) as SlackOAuthResponse;
  if (!data.ok || !data.incoming_webhook?.url) {
    throw new Error(`Slack OAuth failed: ${data.error ?? 'no incoming webhook returned'}`);
  }

  await query(
    `INSERT INTO slack_connections (user_id, team_id, team_name, channel, channel_id, webhook_url, access_token)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id) DO UPDATE SET team_id = EXCLUDED.team_id, team_name = EXCLUDED.team_name,
       channel = EXCLUDED.channel, channel_id = EXCLUDED.channel_id, webhook_url = EXCLUDED.webhook_url,
       access_token = EXCLUDED.access_token, updated_at = now()`,
    [
      Number(userId),
      data.team?.id ?? null,
      data.team?.name ?? null,
      data.incoming_webhook.channel,
      data.incoming_webhook.channel_id,
      data.incoming_webhook.url,
      data.access_token ?? null,
    ],
  );
  logger.info('Slack connected', { userId, team: data.team?.name, channel: data.incoming_webhook.channel });
  return Number(userId);
}

export async function getConnection(userId: number): Promise<SlackConnectionRow | null> {
  return queryOne<SlackConnectionRow>('SELECT * FROM slack_connections WHERE user_id = $1', [userId]);
}

export async function disconnect(userId: number): Promise<void> {
  const conn = await getConnection(userId);
  await query('DELETE FROM slack_connections WHERE user_id = $1', [userId]);
  // best effort
  if (conn?.access_token) {
    await fetch('https://slack.com/api/auth.revoke', {
      method: 'POST',
      headers: { Authorization: `Bearer ${conn.access_token}` },
    }).catch(() => undefined);
  }
}

interface SlackMessage {
  text: string;
  blocks?: unknown[];
}

// Looks the connection up on every call so connect/disconnect applies without a restart. Never throws.
export async function notifyUser(userId: number, message: SlackMessage): Promise<boolean> {
  try {
    const conn = await getConnection(userId);
    if (!conn) return false;
    const res = await fetch(conn.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.warn('Slack webhook rejected message', { userId, status: res.status, body });
      // webhook revoked or channel deleted
      if (res.status === 404 || res.status === 410 || body.includes('no_service') || body.includes('channel_not_found')) {
        await query('DELETE FROM slack_connections WHERE user_id = $1', [userId]);
      }
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('Slack notification failed', { userId, err: errMsg(err) });
    return false;
  }
}

export interface RateLimitHit {
  userId: number;
  senderEmail: string;
  scope: 'sender' | 'campaign' | 'global';
  limit: number;
  blockedWindow: number;
  deferredTo: Date;
  subject: string;
}

// one message per user/sender/scope/hour
export async function notifyRateLimitHit(hit: RateLimitHit): Promise<void> {
  const dedupeKey = `slack:rl-notified:${hit.userId}:${hit.senderEmail}:${hit.scope}:${hit.blockedWindow}`;
  const first = await redis.set(dedupeKey, '1', 'EX', 2 * 3600, 'NX');
  if (first !== 'OK') return;

  const windowStart = new Date(hit.blockedWindow * 3600_000);
  const scopeLabel = { sender: 'per-sender', campaign: 'campaign', global: 'global' }[hit.scope];
  const text =
    `:warning: Hourly ${scopeLabel} limit reached for ${hit.senderEmail} ` +
    `(${hit.limit}/hour, window starting ${windowStart.toISOString()}). ` +
    `Remaining emails are deferred - next one goes out at ${hit.deferredTo.toISOString()}.`;
  const delivered = await notifyUser(hit.userId, {
    text,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'Hourly send limit reached' } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Sender*\n${hit.senderEmail}` },
          { type: 'mrkdwn', text: `*Limit*\n${hit.limit} emails/hour (${scopeLabel})` },
          { type: 'mrkdwn', text: `*Hour window*\n<!date^${Math.floor(windowStart.getTime() / 1000)}^{date_short_pretty} {time}|${windowStart.toISOString()}>` },
          { type: 'mrkdwn', text: `*Resumes at*\n<!date^${Math.floor(hit.deferredTo.getTime() / 1000)}^{date_short_pretty} {time}|${hit.deferredTo.toISOString()}>` },
        ],
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `Campaign: _${hit.subject}_ · Emails are rescheduled, not dropped.` }] },
    ],
  });
  if (!delivered) await redis.del(dedupeKey);
  logger.info('Rate limit hit', { ...hit, slackNotified: delivered });
}

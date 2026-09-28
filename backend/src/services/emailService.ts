import { config } from '../config';
import { query, queryOne, withTransaction } from '../db/pool';
import { errMsg, logger } from '../lib/logger';
import { emailQueue, enqueueEmails, jobIdFor } from '../queue/emailQueue';
import { planSchedule } from '../queue/rateLimiter';
import type { CampaignRow, EmailRow, EmailStatus } from '../types';
import { searchEmailIds, syncEmailsToIndex } from './searchService';
import { getSender } from './senderService';
import { normaliseRecipients } from '../lib/recipients';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface ScheduleInput {
  senderId: number;
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delayBetweenMs: number;
  hourlyLimit: number;
  attachments: AttachmentInput[];
}

export interface AttachmentInput {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface AttachmentMeta {
  id: number;
  filename: string;
  contentType: string;
  size: number;
}

export interface ScheduleResult {
  campaignId: number;
  scheduled: number;
  duplicatesRemoved: number;
  firstScheduledAt: string | null;
  lastScheduledAt: string | null;
}

export async function scheduleCampaign(userId: number, input: ScheduleInput): Promise<ScheduleResult> {
  const sender = await getSender(input.senderId);
  if (!sender) throw new HttpError(400, 'Unknown sender');

  const { valid, duplicates, invalid } = normaliseRecipients(input.recipients);
  if (invalid.length) throw new HttpError(400, `Invalid email address(es): ${invalid.slice(0, 5).join(', ')}`);
  if (!valid.length) throw new HttpError(400, 'At least one recipient is required');

  const startMs = Math.max(input.startTime.getTime(), Date.now());
  const slots = planSchedule(startMs, valid.length, input.delayBetweenMs, input.hourlyLimit);

  const { campaign, emails } = await withTransaction(async (client) => {
    const c = await client.query<CampaignRow>(
      `INSERT INTO campaigns (user_id, sender_id, subject, body, start_time, delay_between_ms, hourly_limit)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [userId, sender.id, input.subject, input.body, new Date(startMs), input.delayBetweenMs, input.hourlyLimit],
    );
    const campaign = c.rows[0];
    const e = await client.query<{ id: string; scheduled_at: Date }>(
      `INSERT INTO emails (campaign_id, user_id, sender_id, recipient, subject, body, scheduled_at)
       SELECT $1, $2, $3, r.recipient, $4, $5, r.scheduled_at
       FROM unnest($6::text[], $7::timestamptz[]) AS r(recipient, scheduled_at)
       RETURNING id, scheduled_at`,
      [campaign.id, userId, sender.id, input.subject, input.body, valid, slots.map((s) => new Date(s))],
    );
    for (const a of input.attachments) {
      await client.query(
        `INSERT INTO attachments (campaign_id, filename, content_type, size_bytes, content) VALUES ($1,$2,$3,$4,$5)`,
        [campaign.id, a.filename, a.contentType, a.content.length, a.content],
      );
    }
    return { campaign, emails: e.rows };
  });

  // if this fails the rows stay 'scheduled' and reconcileQueue() picks them up on next boot
  try {
    await enqueueEmails(emails.map((e) => ({ id: e.id, scheduledAt: e.scheduled_at })));
  } catch (err) {
    logger.error('Failed to enqueue emails; they will be recovered on next boot', { campaignId: campaign.id, err: errMsg(err) });
    throw new HttpError(503, 'Emails were saved but could not be queued yet. They will be queued automatically.');
  }
  void syncEmailsToIndex(emails.map((e) => e.id));

  logger.info('Campaign scheduled', { campaignId: campaign.id, userId, count: emails.length });
  return {
    campaignId: campaign.id,
    scheduled: emails.length,
    duplicatesRemoved: duplicates,
    firstScheduledAt: emails[0]?.scheduled_at.toISOString() ?? null,
    lastScheduledAt: emails[emails.length - 1]?.scheduled_at.toISOString() ?? null,
  };
}

export type EmailTab = 'scheduled' | 'sent';

const TAB_STATUSES: Record<EmailTab, EmailStatus[]> = {
  scheduled: ['scheduled', 'sending'],
  sent: ['sent', 'failed'],
};

export interface EmailListItem {
  id: string;
  campaignId: number;
  recipient: string;
  subject: string;
  bodyPreview: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  failedAt: string | null;
  error: string | null;
  sender: { id: number; email: string; name: string };
}

export interface EmailDetail extends EmailListItem {
  body: string;
  previewUrl: string | null;
  messageId: string | null;
  attempts: number;
  rateLimitedCount: number;
  attachments: AttachmentMeta[];
}

type EmailJoinRow = EmailRow & { sender_email: string; sender_name: string };

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function toListItem(r: EmailJoinRow): EmailListItem {
  return {
    id: String(r.id),
    campaignId: r.campaign_id,
    recipient: r.recipient,
    subject: r.subject,
    bodyPreview: stripHtml(r.body).slice(0, 160),
    status: r.status,
    scheduledAt: r.scheduled_at.toISOString(),
    sentAt: r.sent_at?.toISOString() ?? null,
    failedAt: r.failed_at?.toISOString() ?? null,
    error: r.error,
    sender: { id: r.sender_id, email: r.sender_email, name: r.sender_name },
  };
}

const SELECT_JOIN = `SELECT e.*, s.email AS sender_email, s.name AS sender_name
  FROM emails e JOIN senders s ON s.id = e.sender_id`;

export async function listEmails(
  userId: number,
  tab: EmailTab,
  opts: { q?: string; status?: EmailStatus; page: number; pageSize: number },
): Promise<{ items: EmailListItem[]; total: number; page: number; pageSize: number }> {
  const statuses = opts.status && TAB_STATUSES[tab].includes(opts.status) ? [opts.status] : TAB_STATUSES[tab];
  const order =
    tab === 'scheduled' ? 'e.scheduled_at ASC, e.id ASC' : 'COALESCE(e.sent_at, e.failed_at, e.updated_at) DESC, e.id DESC';
  const offset = (opts.page - 1) * opts.pageSize;
  const q = opts.q?.trim();

  if (q) {
    const ids = await searchEmailIds(userId, q, statuses, 500);
    if (ids) {
      const pageIds = ids.slice(offset, offset + opts.pageSize);
      const rows = pageIds.length
        ? await query<EmailJoinRow>(`${SELECT_JOIN} WHERE e.id = ANY($1::bigint[]) AND e.user_id = $2`, [pageIds, userId])
        : [];
      const byId = new Map(rows.map((r) => [String(r.id), r]));
      const items = pageIds.flatMap((id) => {
        const r = byId.get(id);
        // index can lag behind the DB status
        return r && statuses.includes(r.status) ? [toListItem(r)] : [];
      });
      return { items, total: ids.length, page: opts.page, pageSize: opts.pageSize };
    }
  }

  const params: unknown[] = [userId, statuses];
  let where = 'e.user_id = $1 AND e.status = ANY($2::text[])';
  if (q) {
    params.push(`%${q.replace(/[%_\\]/g, '\\$&')}%`);
    where += ` AND (e.recipient ILIKE $3 OR e.subject ILIKE $3 OR e.body ILIKE $3)`;
  }
  const countRow = await queryOne<{ count: string }>(`SELECT count(*)::text AS count FROM emails e WHERE ${where}`, params);
  const rows = await query<EmailJoinRow>(
    `${SELECT_JOIN} WHERE ${where} ORDER BY ${order} LIMIT ${opts.pageSize} OFFSET ${offset}`,
    params,
  );
  return { items: rows.map(toListItem), total: Number(countRow?.count ?? 0), page: opts.page, pageSize: opts.pageSize };
}

export async function getEmailCounts(userId: number): Promise<Record<EmailTab, number>> {
  const rows = await query<{ status: EmailStatus; count: string }>(
    'SELECT status, count(*)::text AS count FROM emails WHERE user_id = $1 GROUP BY status',
    [userId],
  );
  const counts: Record<EmailTab, number> = { scheduled: 0, sent: 0 };
  for (const r of rows) {
    if (TAB_STATUSES.scheduled.includes(r.status)) counts.scheduled += Number(r.count);
    else counts.sent += Number(r.count);
  }
  return counts;
}

export async function getEmail(userId: number, id: string): Promise<EmailDetail | null> {
  if (!/^\d+$/.test(id)) return null;
  const r = await queryOne<EmailJoinRow>(`${SELECT_JOIN} WHERE e.id = $1 AND e.user_id = $2`, [id, userId]);
  if (!r) return null;
  const attachments = await query<AttachmentMeta>(
    `SELECT id, filename, content_type AS "contentType", size_bytes AS size FROM attachments WHERE campaign_id = $1 ORDER BY id`,
    [r.campaign_id],
  );
  return {
    ...toListItem(r),
    body: r.body,
    previewUrl: r.preview_url,
    messageId: r.message_id,
    attempts: r.attempts,
    rateLimitedCount: r.rate_limited_count,
    attachments,
  };
}

export async function getAttachment(
  userId: number,
  emailId: string,
  attachmentId: string,
): Promise<{ filename: string; content_type: string; content: Buffer } | null> {
  if (!/^\d+$/.test(emailId) || !/^\d+$/.test(attachmentId)) return null;
  return queryOne(
    `SELECT a.filename, a.content_type, a.content
     FROM attachments a JOIN emails e ON e.campaign_id = a.campaign_id
     WHERE a.id = $1 AND e.id = $2 AND e.user_id = $3`,
    [attachmentId, emailId, userId],
  );
}

// Makes sure every pending email has a job. Normally a no-op; covers Redis data loss and
// a crash between commit and enqueue.
export async function reconcileQueue(): Promise<void> {
  const pending = await query<{ id: string; scheduled_at: Date }>(
    `SELECT id, scheduled_at FROM emails WHERE status IN ('scheduled', 'sending') ORDER BY scheduled_at`,
  );
  const missing: { id: string; scheduledAt: Date }[] = [];
  for (const e of pending) {
    const job = await emailQueue.getJob(jobIdFor(e.id));
    if (!job) {
      missing.push({ id: e.id, scheduledAt: e.scheduled_at });
      continue;
    }
    const state = await job.getState();
    if (state === 'completed' || state === 'failed') {
      await job.remove();
      missing.push({ id: e.id, scheduledAt: e.scheduled_at });
    }
  }
  if (missing.length) await enqueueEmails(missing);
  logger.info('Queue reconciled', { pending: pending.length, reEnqueued: missing.length });
}

export const limits = {
  minDelayBetweenSendsMs: config.queue.minDelayBetweenSendsMs,
  maxEmailsPerHourPerSender: config.queue.maxEmailsPerHourPerSender,
  maxEmailsPerHourGlobal: config.queue.maxEmailsPerHourGlobal,
  workerConcurrency: config.queue.workerConcurrency,
};

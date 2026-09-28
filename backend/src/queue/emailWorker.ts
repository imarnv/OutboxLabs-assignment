import { DelayedError, type Job, Worker } from 'bullmq';
import { config } from '../config';
import { query, queryOne } from '../db/pool';
import { sendMail } from '../lib/mailer';
import { errMsg, logger } from '../lib/logger';
import { createRedis, redis } from '../lib/redis';
import { syncEmailToIndex } from '../services/searchService';
import { getSender } from '../services/senderService';
import { notifyRateLimitHit } from '../services/slackService';
import type { CampaignRow, EmailRow, SendEmailJobData } from '../types';
import { HourlyRateLimiter } from './rateLimiter';

// a 'sending' row older than this belongs to a dead worker
const STALE_SEND_LOCK_MS = 2 * 60 * 1000;
const SLOT_TOLERANCE_MS = 250;

interface JobState extends SendEmailJobData {
  reservedSlotAt?: number;
}

const limiter = new HourlyRateLimiter(redis);

async function processSendEmail(job: Job<JobState>, token?: string): Promise<string> {
  const { emailId } = job.data;
  const email = await queryOne<EmailRow>('SELECT * FROM emails WHERE id = $1', [emailId]);

  // DB row is the source of truth; a replayed job for a finished email does nothing
  if (!email) return 'skipped:missing';
  if (email.status === 'sent' || email.status === 'failed') return `skipped:${email.status}`;

  if (email.status === 'sending' && email.locked_at && Date.now() - email.locked_at.getTime() < STALE_SEND_LOCK_MS) {
    await job.moveToDelayed(email.locked_at.getTime() + STALE_SEND_LOCK_MS, token);
    throw new DelayedError();
  }

  // Reserve once and keep it on the job, so retries don't eat more quota.
  let slotAt = job.data.reservedSlotAt;
  if (slotAt === undefined) {
    const campaign = await queryOne<CampaignRow>('SELECT * FROM campaigns WHERE id = $1', [email.campaign_id]);
    const reservation = await limiter.reserve({
      senderId: email.sender_id,
      campaignId: email.campaign_id,
      campaignHourlyLimit: campaign?.hourly_limit ?? 0,
      notBefore: Date.now(),
    });
    slotAt = reservation.slotAt;
    await job.updateData({ ...job.data, reservedSlotAt: slotAt });

    if (Math.abs(slotAt - email.scheduled_at.getTime()) > 1000 || reservation.deferredBy) {
      await query(
        `UPDATE emails SET scheduled_at = $2, rate_limited_count = rate_limited_count + $3, updated_at = now()
         WHERE id = $1 AND status = 'scheduled'`,
        [emailId, new Date(Math.max(slotAt, email.scheduled_at.getTime())), reservation.deferredBy ? 1 : 0],
      );
      void syncEmailToIndex(emailId);
    }

    if (reservation.deferredBy) {
      const sender = await getSender(email.sender_id);
      const limitValue =
        reservation.deferredBy === 'sender'
          ? limiter.limits.senderLimit
          : reservation.deferredBy === 'global'
            ? limiter.limits.globalLimit
            : (campaign?.hourly_limit ?? 0);
      void notifyRateLimitHit({
        userId: email.user_id,
        senderEmail: sender?.email ?? `sender #${email.sender_id}`,
        scope: reservation.deferredBy,
        limit: limitValue,
        blockedWindow: reservation.blockedWindow ?? reservation.window,
        deferredTo: new Date(slotAt),
        subject: email.subject,
      });
    }
  }

  if (slotAt > Date.now() + SLOT_TOLERANCE_MS) {
    await job.moveToDelayed(slotAt, token);
    throw new DelayedError();
  }

  const claimed = await queryOne<EmailRow>(
    `UPDATE emails SET status = 'sending', locked_at = now(), attempts = attempts + 1, updated_at = now()
     WHERE id = $1 AND (status = 'scheduled' OR (status = 'sending' AND locked_at < now() - ($2::int * interval '1 millisecond')))
     RETURNING *`,
    [emailId, STALE_SEND_LOCK_MS],
  );
  if (!claimed) return 'skipped:claimed-elsewhere';

  const sender = await getSender(claimed.sender_id);
  if (!sender) throw new Error(`Sender ${claimed.sender_id} not found`);

  try {
    const result = await sendMail(sender, {
      to: claimed.recipient,
      subject: claimed.subject,
      html: claimed.body,
      text: claimed.body.replace(/<[^>]*>/g, ''),
      messageId: `<email-${claimed.id}.c${claimed.campaign_id}@reachinbox.scheduler>`,
    });
    await query(
      `UPDATE emails SET status = 'sent', sent_at = now(), locked_at = NULL, error = NULL,
         message_id = $2, preview_url = $3, updated_at = now()
       WHERE id = $1 AND status = 'sending'`,
      [emailId, result.messageId, result.previewUrl],
    );
    void syncEmailToIndex(emailId);
    logger.info('Email sent', { emailId, to: claimed.recipient, sender: sender.email, preview: result.previewUrl });
    return 'sent';
  } catch (err) {
    const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    await query(
      `UPDATE emails SET status = $2::text, locked_at = NULL, error = $3, failed_at = CASE WHEN $2::text = 'failed' THEN now() END,
         updated_at = now()
       WHERE id = $1 AND status = 'sending'`,
      [emailId, finalAttempt ? 'failed' : 'scheduled', errMsg(err)],
    );
    void syncEmailToIndex(emailId);
    logger.warn('Email send failed', { emailId, attempt: job.attemptsMade + 1, finalAttempt, err: errMsg(err) });
    throw err;
  }
}

export function startEmailWorker(): Worker<JobState> {
  const worker = new Worker<JobState>(config.queue.name, processSendEmail, {
    connection: createRedis(),
    concurrency: config.queue.workerConcurrency,
    lockDuration: 60_000,
    maxStalledCount: 3,
  });

  worker.on('failed', (job, err) => {
    if (!job) return;
    logger.warn('Job failed', { jobId: job.id, attemptsMade: job.attemptsMade, err: err.message });
  });
  worker.on('error', (err) => logger.error('Worker error', { err: err.message }));
  worker.on('ready', () =>
    logger.info('Email worker ready', {
      queue: config.queue.name,
      concurrency: config.queue.workerConcurrency,
      minDelayBetweenSendsMs: config.queue.minDelayBetweenSendsMs,
      maxPerHourPerSender: config.queue.maxEmailsPerHourPerSender,
      maxPerHourGlobal: config.queue.maxEmailsPerHourGlobal,
    }),
  );
  return worker;
}

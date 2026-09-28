import { Queue } from 'bullmq';
import { config } from '../config';
import { createRedis } from '../lib/redis';
import type { SendEmailJobData } from '../types';

export const emailQueue = new Queue<SendEmailJobData>(config.queue.name, {
  connection: createRedis(),
  defaultJobOptions: {
    attempts: config.queue.maxAttempts,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { age: 7 * 24 * 3600, count: 10_000 },
    removeOnFail: { age: 30 * 24 * 3600 },
  },
});

// BullMQ ignores adds for an existing jobId, so an email can only be queued once.
export function jobIdFor(emailId: string | number): string {
  return `email-${emailId}`;
}

export interface EnqueueItem {
  id: string;
  scheduledAt: Date;
}

export async function enqueueEmails(items: EnqueueItem[]): Promise<void> {
  const now = Date.now();
  const CHUNK = 500;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    await emailQueue.addBulk(
      chunk.map((e) => ({
        name: 'send-email',
        data: { emailId: e.id },
        opts: { jobId: jobIdFor(e.id), delay: Math.max(0, e.scheduledAt.getTime() - now) },
      })),
    );
  }
}

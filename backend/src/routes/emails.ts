import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { getEmail, getEmailCounts, listEmails, scheduleCampaign } from '../services/emailService';

export const emailsRouter = Router();

const MAX_RECIPIENTS = 10_000;

const scheduleSchema = z.object({
  senderId: z.coerce.number().int().positive(),
  subject: z.string().trim().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required').max(200_000),
  recipients: z.array(z.string()).min(1, 'Add at least one recipient').max(MAX_RECIPIENTS),
  startTime: z.coerce.date(),
  delayBetweenSeconds: z.coerce.number().int().min(0).max(24 * 3600),
  hourlyLimit: z.coerce.number().int().min(0).max(100_000),
});

emailsRouter.post(
  '/schedule',
  asyncHandler(async (req, res) => {
    const input = scheduleSchema.parse(req.body);
    const result = await scheduleCampaign(req.user!.id, {
      senderId: input.senderId,
      subject: input.subject,
      body: input.body,
      recipients: input.recipients,
      startTime: input.startTime,
      delayBetweenMs: input.delayBetweenSeconds * 1000,
      hourlyLimit: input.hourlyLimit,
    });
    res.status(201).json(result);
  }),
);

const listSchema = z.object({
  status: z.enum(['scheduled', 'sent']).default('scheduled'),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

emailsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, ...opts } = listSchema.parse(req.query);
    res.json(await listEmails(req.user!.id, status, opts));
  }),
);

emailsRouter.get(
  '/counts',
  asyncHandler(async (req, res) => {
    res.json(await getEmailCounts(req.user!.id));
  }),
);

emailsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const email = await getEmail(req.user!.id, req.params.id);
    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    res.json(email);
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { getAttachment, getEmail, getEmailCounts, HttpError, listEmails, scheduleCampaign } from '../services/emailService';

export const emailsRouter = Router();

const MAX_RECIPIENTS = 10_000;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const attachmentSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().max(255).default('application/octet-stream'),
  contentBase64: z.string().min(1),
});

const scheduleSchema = z.object({
  senderId: z.coerce.number().int().positive(),
  subject: z.string().trim().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required').max(200_000),
  recipients: z.array(z.string()).min(1, 'Add at least one recipient').max(MAX_RECIPIENTS),
  startTime: z.coerce.date(),
  delayBetweenSeconds: z.coerce.number().int().min(0).max(24 * 3600),
  hourlyLimit: z.coerce.number().int().min(0).max(100_000),
  attachments: z.array(attachmentSchema).max(5).default([]),
});

emailsRouter.post(
  '/schedule',
  asyncHandler(async (req, res) => {
    const input = scheduleSchema.parse(req.body);
    const attachments = input.attachments.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      content: Buffer.from(a.contentBase64, 'base64'),
    }));
    if (attachments.reduce((sum, a) => sum + a.content.length, 0) > MAX_ATTACHMENT_BYTES) {
      throw new HttpError(413, 'Attachments are limited to 5 MB in total');
    }
    const result = await scheduleCampaign(req.user!.id, {
      senderId: input.senderId,
      subject: input.subject,
      body: input.body,
      recipients: input.recipients,
      startTime: input.startTime,
      delayBetweenMs: input.delayBetweenSeconds * 1000,
      hourlyLimit: input.hourlyLimit,
      attachments,
    });
    res.status(201).json(result);
  }),
);

const listSchema = z.object({
  status: z.enum(['scheduled', 'sent']).default('scheduled'),
  filter: z.enum(['scheduled', 'sending', 'sent', 'failed']).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

emailsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, filter, ...opts } = listSchema.parse(req.query);
    res.json(await listEmails(req.user!.id, status, { ...opts, status: filter }));
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

emailsRouter.get(
  '/:id/attachments/:attachmentId',
  asyncHandler(async (req, res) => {
    const file = await getAttachment(req.user!.id, req.params.id, req.params.attachmentId);
    if (!file) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }
    res.setHeader('Content-Type', file.content_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(file.content);
  }),
);

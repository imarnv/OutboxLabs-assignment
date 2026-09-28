import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { listSenders } from '../services/senderService';
import { limits } from '../services/emailService';

export const sendersRouter = Router();

sendersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ senders: await listSenders(), limits });
  }),
);

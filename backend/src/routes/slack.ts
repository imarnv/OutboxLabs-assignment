import { Router } from 'express';
import { config } from '../config';
import { errMsg, logger } from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
  buildAuthorizeUrl,
  completeOAuth,
  disconnect,
  getConnection,
  isSlackConfigured,
  notifyUser,
} from '../services/slackService';

export const slackRouter = Router();

slackRouter.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const conn = await getConnection(req.user!.id);
    res.json({
      configured: isSlackConfigured(),
      connected: Boolean(conn),
      teamName: conn?.team_name ?? null,
      channel: conn?.channel ?? null,
    });
  }),
);

slackRouter.get(
  '/connect',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isSlackConfigured()) {
      res.redirect(`${config.frontendUrl}/dashboard?slack=error&message=${encodeURIComponent('Slack is not configured on the server')}`);
      return;
    }
    res.redirect(await buildAuthorizeUrl(req.user!.id));
  }),
);

// user comes from the one-time state, not the session cookie
slackRouter.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query as Record<string, string | undefined>;
    const back = (params: string) => res.redirect(`${config.frontendUrl}/dashboard?${params}`);
    if (error || !code || !state) return back(`slack=error&message=${encodeURIComponent(error ?? 'Slack authorization was cancelled')}`);
    try {
      const userId = await completeOAuth(code, state);
      await notifyUser(userId, {
        text: ':white_check_mark: ReachInbox Scheduler is connected. You will be notified here when a sender hits its hourly limit.',
      });
      back('slack=connected');
    } catch (err) {
      logger.warn('Slack OAuth callback failed', { err: errMsg(err) });
      back(`slack=error&message=${encodeURIComponent(errMsg(err))}`);
    }
  }),
);

slackRouter.post(
  '/test',
  requireAuth,
  asyncHandler(async (req, res) => {
    const ok = await notifyUser(req.user!.id, { text: ':bell: Test notification from ReachInbox Scheduler.' });
    if (!ok) {
      res.status(400).json({ error: 'Slack is not connected (or the webhook was revoked).' });
      return;
    }
    res.json({ ok: true });
  }),
);

slackRouter.delete(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    await disconnect(req.user!.id);
    res.json({ ok: true });
  }),
);

import crypto from 'node:crypto';
import { Router } from 'express';
import { config, isProd } from '../config';
import { queryOne } from '../db/pool';
import { errMsg, logger } from '../lib/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { clearSession, issueSession, readSession } from '../middleware/auth';
import type { UserRow } from '../types';

export const authRouter = Router();

const STATE_COOKIE = 'ri_oauth_state';
const googleRedirectUri = () => process.env.GOOGLE_REDIRECT_URI || `${config.publicApiUrl}/api/auth/google/callback`;

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

authRouter.get('/google', (_req, res) => {
  if (!config.google.clientId) {
    res.status(500).send('GOOGLE_CLIENT_ID is not configured on the server.');
    return;
  }
  const state = crypto.randomBytes(24).toString('hex');
  res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 10 * 60 * 1000, path: '/' });
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRouter.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query as Record<string, string | undefined>;
    const expectedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: '/' });
    const fail = (reason: string) => res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent(reason)}`);

    if (error) return fail(error);
    if (!code || !state || state !== expectedState) return fail('Invalid login state, please try again.');

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri: googleRedirectUri(),
          grant_type: 'authorization_code',
        }),
      });
      const tokens = (await tokenRes.json()) as GoogleTokenResponse;
      if (!tokens.access_token) throw new Error(tokens.error_description || tokens.error || 'No access token');

      const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const info = (await infoRes.json()) as GoogleUserInfo;
      if (!info.sub || !info.email) throw new Error('Google did not return a profile');

      const user = await queryOne<UserRow>(
        `INSERT INTO users (google_id, email, name, avatar_url) VALUES ($1,$2,$3,$4)
         ON CONFLICT (google_id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
         RETURNING *`,
        [info.sub, info.email, info.name ?? info.email, info.picture ?? null],
      );
      if (!user) throw new Error('Could not save user');

      issueSession(res, { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url });
      res.redirect(`${config.frontendUrl}/dashboard`);
    } catch (err) {
      logger.warn('Google login failed', { err: errMsg(err) });
      fail('Google login failed, please try again.');
    }
  }),
);

authRouter.get('/me', (req, res) => {
  const user = readSession(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ user });
});

authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

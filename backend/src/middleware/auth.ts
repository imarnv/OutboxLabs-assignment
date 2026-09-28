import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config, isProd } from '../config';
import type { AuthUser } from '../types';

export const SESSION_COOKIE = 'ri_session';
const SESSION_TTL_SECONDS = 7 * 24 * 3600;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function issueSession(res: Response, user: AuthUser): void {
  const token = jwt.sign(user, config.jwtSecret, { expiresIn: SESSION_TTL_SECONDS, subject: String(user.id) });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function readSession(req: Request): AuthUser | null {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser & jwt.JwtPayload;
    return { id: payload.id, email: payload.email, name: payload.name, avatarUrl: payload.avatarUrl ?? null };
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = readSession(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  req.user = user;
  next();
}

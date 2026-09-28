import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { errMsg, logger } from '../lib/logger';
import { HttpError } from '../services/emailService';

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const status = (err as { status?: number; statusCode?: number }).status ?? (err as { statusCode?: number }).statusCode;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: errMsg(err) });
    return;
  }
  logger.error('Unhandled error', { err: errMsg(err), stack: err instanceof Error ? err.stack : undefined });
  res.status(500).json({ error: 'Internal server error' });
}

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type RequestHandler } from 'express';
import { config } from './config';
import { pool } from './db/pool';
import { isElasticAvailable } from './lib/elastic';
import { redis } from './lib/redis';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { emailQueue } from './queue/emailQueue';
import { authRouter } from './routes/auth';
import { emailsRouter } from './routes/emails';
import { sendersRouter } from './routes/senders';
import { slackRouter } from './routes/slack';

function basicAuth(user: string, password: string): RequestHandler {
  return (req, res, next) => {
    if (!user) return next();
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    const [u, p] = Buffer.from(encoded ?? '', 'base64').toString().split(':');
    if (scheme === 'Basic' && u === user && p === password) return next();
    res.set('WWW-Authenticate', 'Basic realm="Queues"').status(401).send('Authentication required');
  };
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '5mb' }));

  const boardAdapter = new ExpressAdapter();
  boardAdapter.setBasePath(config.bullBoard.path);
  createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter: boardAdapter });
  app.use(config.bullBoard.path, basicAuth(config.bullBoard.user, config.bullBoard.password), boardAdapter.getRouter());

  app.get('/api/health', async (_req, res) => {
    const [db, rds] = await Promise.all([
      pool.query('SELECT 1').then(() => true, () => false),
      redis.ping().then(() => true, () => false),
    ]);
    res.status(db && rds ? 200 : 503).json({ db, redis: rds, elasticsearch: isElasticAvailable() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/slack', slackRouter);
  app.use('/api/senders', requireAuth, sendersRouter);
  app.use('/api/emails', requireAuth, emailsRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}

import type { Worker } from 'bullmq';
import { bootstrap } from './bootstrap';
import { createApp } from './app';
import { config } from './config';
import { pool } from './db/pool';
import { closeTransporters } from './lib/mailer';
import { errMsg, logger } from './lib/logger';
import { redis } from './lib/redis';
import { emailQueue } from './queue/emailQueue';
import { startEmailWorker } from './queue/emailWorker';
import { reconcileQueue } from './services/emailService';

async function main() {
  await bootstrap();
  await reconcileQueue();

  const worker: Worker | null = config.queue.runWorkerInApi ? startEmailWorker() : null;
  const server = createApp().listen(config.port, () => {
    logger.info(`API listening on http://localhost:${config.port}`, {
      bullBoard: `http://localhost:${config.port}${config.bullBoard.path}`,
      workerInProcess: Boolean(worker),
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    server.close();
    await worker?.close();
    await emailQueue.close();
    closeTransporters();
    await redis.quit();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { err: errMsg(err) });
  process.exit(1);
});

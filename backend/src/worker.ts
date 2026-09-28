// Standalone worker. Safe to run several: all limits live in Redis.
import { bootstrap } from './bootstrap';
import { pool } from './db/pool';
import { closeTransporters } from './lib/mailer';
import { errMsg, logger } from './lib/logger';
import { redis } from './lib/redis';
import { startEmailWorker } from './queue/emailWorker';

async function main() {
  await bootstrap();
  const worker = startEmailWorker();
  const shutdown = async (signal: string) => {
    logger.info(`Worker received ${signal}, closing`);
    await worker.close();
    closeTransporters();
    await redis.quit();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Worker failed to start', { err: errMsg(err) });
  process.exit(1);
});

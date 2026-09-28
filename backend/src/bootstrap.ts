import { migrate } from './db/migrate';
import { ensureEmailIndex } from './lib/elastic';
import { errMsg, logger } from './lib/logger';
import { ensureSenders } from './services/senderService';

export async function bootstrap(): Promise<void> {
  await migrate();
  try {
    await ensureSenders();
  } catch (err) {
    logger.error('Could not provision Ethereal senders (is outbound network available?)', { err: errMsg(err) });
  }
  await ensureEmailIndex();
}

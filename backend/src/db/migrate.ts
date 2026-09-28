import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool';
import { logger } from '../lib/logger';

export async function migrate(): Promise<void> {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  logger.info('Database schema is up to date');
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      logger.error('Migration failed', { err: String(err) });
      process.exit(1);
    });
}

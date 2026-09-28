import nodemailer from 'nodemailer';
import { config } from '../config';
import { pool, query, queryOne } from '../db/pool';
import { logger } from '../lib/logger';
import type { SenderRow } from '../types';

export interface PublicSender {
  id: number;
  email: string;
  name: string;
}

const SENDER_NAMES = ['Oliver Brown', 'Ava Johnson', 'Liam Carter', 'Sophia Lee', 'Noah Wilson'];

interface SmtpSenderConfig {
  name?: string;
  email: string;
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
}

// Advisory lock so the API and worker don't both create Ethereal accounts on first boot.
export async function ensureSenders(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(424242)');
    const configured = process.env.SMTP_SENDERS ? (JSON.parse(process.env.SMTP_SENDERS) as SmtpSenderConfig[]) : [];
    for (const s of configured) {
      await client.query(
        `INSERT INTO senders (email, name, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, smtp_host = EXCLUDED.smtp_host,
           smtp_port = EXCLUDED.smtp_port, smtp_secure = EXCLUDED.smtp_secure,
           smtp_user = EXCLUDED.smtp_user, smtp_pass = EXCLUDED.smtp_pass`,
        [s.email, s.name ?? s.email, s.host, s.port, s.secure ?? false, s.user, s.pass],
      );
    }

    const { rows } = await client.query<{ count: string }>('SELECT count(*)::text AS count FROM senders');
    const existing = Number(rows[0].count);
    const wanted = config.senders.etherealSenderCount;
    for (let i = existing; i < wanted; i++) {
      const acct = await nodemailer.createTestAccount();
      const name = SENDER_NAMES[i % SENDER_NAMES.length];
      await client.query(
        `INSERT INTO senders (email, name, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (email) DO NOTHING`,
        [acct.user, name, acct.smtp.host, acct.smtp.port, acct.smtp.secure, acct.user, acct.pass],
      );
      logger.info('Provisioned Ethereal sender', { email: acct.user, name });
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(424242)').catch(() => undefined);
    client.release();
  }
}

export async function listSenders(): Promise<PublicSender[]> {
  return query<PublicSender>('SELECT id, email, name FROM senders ORDER BY id');
}

export async function getSender(id: number): Promise<SenderRow | null> {
  return queryOne<SenderRow>('SELECT * FROM senders WHERE id = $1', [id]);
}

import { config } from '../config';
import { query } from '../db/pool';
import { elastic, isElasticAvailable } from '../lib/elastic';
import { errMsg, logger } from '../lib/logger';
import type { EmailRow } from '../types';

type IndexableEmail = EmailRow & { sender_email?: string };

function toDoc(e: IndexableEmail) {
  return {
    id: String(e.id),
    userId: e.user_id,
    campaignId: e.campaign_id,
    senderId: e.sender_id,
    senderEmail: e.sender_email,
    recipient: e.recipient,
    subject: e.subject,
    body: e.body,
    status: e.status,
    scheduledAt: e.scheduled_at,
    sentAt: e.sent_at,
    createdAt: e.created_at,
  };
}

// Indexing failures are only logged; search must never block sending.
export async function syncEmailsToIndex(ids: string[]): Promise<void> {
  if (!isElasticAvailable() || ids.length === 0) return;
  try {
    const rows = await query<IndexableEmail>(
      `SELECT e.*, s.email AS sender_email FROM emails e JOIN senders s ON s.id = e.sender_id WHERE e.id = ANY($1::bigint[])`,
      [ids],
    );
    const CHUNK = 1000;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const operations = rows
        .slice(i, i + CHUNK)
        .flatMap((r) => [{ index: { _index: config.elasticsearchIndex, _id: String(r.id) } }, toDoc(r)]);
      const res = await elastic.bulk({ operations, refresh: false });
      if (res.errors) logger.warn('Some emails failed to index', { count: rows.length });
    }
  } catch (err) {
    logger.warn('Elasticsearch indexing failed', { err: errMsg(err) });
  }
}

export async function syncEmailToIndex(id: string): Promise<void> {
  return syncEmailsToIndex([id]);
}

// Returns null when ES is unavailable so the caller can fall back to Postgres.
export async function searchEmailIds(
  userId: number,
  q: string,
  statuses: string[],
  limit: number,
): Promise<string[] | null> {
  if (!isElasticAvailable()) return null;
  try {
    const res = await elastic.search<{ id: string }>({
      index: config.elasticsearchIndex,
      size: limit,
      _source: ['id'],
      query: {
        bool: {
          filter: [{ term: { userId } }, { terms: { status: statuses } }],
          must: [
            {
              multi_match: {
                query: q,
                type: 'bool_prefix',
                fields: [
                  'recipient^3',
                  'recipient.ngram',
                  'recipient.ngram._2gram',
                  'subject^2',
                  'subject.prefix',
                  'subject.prefix._2gram',
                  'body',
                  'senderEmail',
                ],
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
    });
    return res.hits.hits.map((h) => h._source?.id ?? String(h._id));
  } catch (err) {
    logger.warn('Elasticsearch search failed, falling back to Postgres', { err: errMsg(err) });
    return null;
  }
}

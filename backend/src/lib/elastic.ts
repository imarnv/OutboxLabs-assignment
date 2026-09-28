import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { errMsg, logger } from './logger';

export const elastic = new Client({ node: config.elasticsearchUrl, requestTimeout: 5000, maxRetries: 1 });

let available = false;

export function isElasticAvailable(): boolean {
  return available;
}

export async function ensureEmailIndex(): Promise<void> {
  try {
    const exists = await elastic.indices.exists({ index: config.elasticsearchIndex });
    if (!exists) {
      await elastic.indices.create({
        index: config.elasticsearchIndex,
        settings: {
          analysis: {
            analyzer: {
              email_analyzer: { type: 'custom', tokenizer: 'uax_url_email', filter: ['lowercase'] },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'integer' },
            campaignId: { type: 'integer' },
            senderId: { type: 'integer' },
            senderEmail: { type: 'text', analyzer: 'email_analyzer', fields: { raw: { type: 'keyword' } } },
            recipient: {
              type: 'text',
              analyzer: 'email_analyzer',
              fields: { raw: { type: 'keyword' }, ngram: { type: 'search_as_you_type' } },
            },
            subject: { type: 'text', fields: { prefix: { type: 'search_as_you_type' } } },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      logger.info('Created Elasticsearch index', { index: config.elasticsearchIndex });
    }
    available = true;
  } catch (err) {
    available = false;
    logger.warn('Elasticsearch unavailable; search will fall back to Postgres', { err: errMsg(err) });
  }
}

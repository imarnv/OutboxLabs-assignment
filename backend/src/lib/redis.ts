import IORedis, { type Redis } from 'ioredis';
import { config } from '../config';

// BullMQ workers need maxRetriesPerRequest: null
export function createRedis(): Redis {
  return new IORedis(config.redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: true });
}

export const redis = createRedis();

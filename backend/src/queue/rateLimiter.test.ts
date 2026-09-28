import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import IORedis from 'ioredis';
import { HOUR_MS, HourlyRateLimiter, planSchedule } from './rateLimiter';

describe('planSchedule', () => {
  it('spaces emails by the delay', () => {
    const start = 10 * HOUR_MS;
    assert.deepEqual(planSchedule(start, 3, 2000, 0), [start, start + 2000, start + 4000]);
  });

  it('rolls into the next clock hour once the hourly limit is reached', () => {
    const start = 10 * HOUR_MS + 59 * 60_000; // 10:59
    const slots = planSchedule(start, 5, 1000, 2);
    assert.deepEqual(slots, [start, start + 1000, 11 * HOUR_MS, 11 * HOUR_MS + 1000, 12 * HOUR_MS]);
  });

  it('handles 1000 emails with a limit of 200/hour', () => {
    const slots = planSchedule(0, 1000, 0, 200);
    const perHour = new Map<number, number>();
    for (const s of slots) perHour.set(Math.floor(s / HOUR_MS), (perHour.get(Math.floor(s / HOUR_MS)) ?? 0) + 1);
    assert.deepEqual([...perHour.values()], [200, 200, 200, 200, 200]);
    assert.ok(slots.every((s, i) => i === 0 || s >= slots[i - 1]), 'order is preserved');
  });
});

describe('HourlyRateLimiter (needs Redis at REDIS_URL)', () => {
  const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1 });
  let available = true;
  const prefix = `test:rl:${Date.now()}:`;

  before(async () => {
    try {
      await redis.connect();
    } catch {
      available = false;
    }
  });
  after(async () => {
    if (available) {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length) await redis.del(...keys);
    }
    redis.disconnect();
  });

  it('enforces min gap, per-sender hourly cap and defers into the next hour', async (t) => {
    if (!available) return t.skip('Redis not available');
    const limiter = new HourlyRateLimiter(redis, { prefix, minGapMs: 2000, senderLimit: 3, globalLimit: 0 });
    const now = 5 * HOUR_MS + 10_000;
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(await limiter.reserve({ senderId: 1, campaignId: 1, campaignHourlyLimit: 0, notBefore: now }));
    }
    assert.deepEqual(
      results.map((r) => r.slotAt),
      [now, now + 2000, now + 4000, 6 * HOUR_MS, 6 * HOUR_MS + 2000],
    );
    assert.deepEqual(
      results.map((r) => r.deferredBy),
      [null, null, null, 'sender', 'sender'],
    );
    // A different sender is unaffected.
    const other = await limiter.reserve({ senderId: 2, campaignId: 2, campaignHourlyLimit: 0, notBefore: now });
    assert.equal(other.slotAt, now);
    assert.equal(other.deferredBy, null);
  });

  it('is safe under concurrent reservations (no over-allocation)', async (t) => {
    if (!available) return t.skip('Redis not available');
    const limiter = new HourlyRateLimiter(redis, { prefix: `${prefix}c:`, minGapMs: 0, senderLimit: 10, globalLimit: 0 });
    const now = 7 * HOUR_MS;
    const results = await Promise.all(
      Array.from({ length: 50 }, () => limiter.reserve({ senderId: 9, campaignId: 9, campaignHourlyLimit: 0, notBefore: now })),
    );
    const inFirstHour = results.filter((r) => r.window === 7).length;
    assert.equal(inFirstHour, 10);
    const perWindow = new Map<number, number>();
    for (const r of results) perWindow.set(r.window, (perWindow.get(r.window) ?? 0) + 1);
    assert.ok([...perWindow.values()].every((n) => n <= 10));
  });

  it('applies the campaign hourly limit on top of the sender limit', async (t) => {
    if (!available) return t.skip('Redis not available');
    const limiter = new HourlyRateLimiter(redis, { prefix: `${prefix}k:`, minGapMs: 0, senderLimit: 100, globalLimit: 0 });
    const now = 9 * HOUR_MS;
    const r = [];
    for (let i = 0; i < 3; i++) r.push(await limiter.reserve({ senderId: 3, campaignId: 30, campaignHourlyLimit: 2, notBefore: now }));
    assert.deepEqual(r.map((x) => x.deferredBy), [null, null, 'campaign']);
    assert.equal(r[2].slotAt, 10 * HOUR_MS);
  });
});

import type { Redis } from 'ioredis';
import { config } from '../config';

export const HOUR_MS = 60 * 60 * 1000;

export type LimitScope = 'sender' | 'campaign' | 'global';

export interface ReserveInput {
  senderId: number;
  campaignId: number;
  campaignHourlyLimit: number;
  notBefore: number;
}

export interface Reservation {
  slotAt: number;
  window: number;
  // set when the requested hour was full and the email got pushed to a later one
  deferredBy: LimitScope | null;
  blockedWindow: number | null;
}

/*
 * Reserves the next send slot for a sender, atomically.
 *
 *   rl:next:sender:{id}              next free timestamp (enforces the min gap)
 *   rl:count:sender:{id}:{hour}      per-sender count for that clock hour
 *   rl:count:campaign:{id}:{hour}    per-campaign count
 *   rl:count:global:{hour}           global count
 *
 * If an hour is full the slot moves to the start of the next one.
 * Keys are built inside the script, so this won't work on Redis Cluster as-is.
 */
const RESERVE_LUA = `
local prefix        = ARGV[1]
local senderId      = ARGV[2]
local campaignId    = ARGV[3]
local notBefore     = tonumber(ARGV[4])
local gap           = tonumber(ARGV[5])
local senderLimit   = tonumber(ARGV[6])
local campaignLimit = tonumber(ARGV[7])
local globalLimit   = tonumber(ARGV[8])
local hourMs        = tonumber(ARGV[9])

local nextKey = prefix .. 'next:sender:' .. senderId
local slot = tonumber(redis.call('GET', nextKey) or '0')
if slot < notBefore then slot = notBefore end

local deferredBy = ''
local blockedWindow = -1

local function blockedScope(window)
  local sKey = prefix .. 'count:sender:' .. senderId .. ':' .. window
  local cKey = prefix .. 'count:campaign:' .. campaignId .. ':' .. window
  local gKey = prefix .. 'count:global:' .. window
  if senderLimit > 0 and tonumber(redis.call('GET', sKey) or '0') >= senderLimit then return 'sender' end
  if campaignLimit > 0 and tonumber(redis.call('GET', cKey) or '0') >= campaignLimit then return 'campaign' end
  if globalLimit > 0 and tonumber(redis.call('GET', gKey) or '0') >= globalLimit then return 'global' end
  return ''
end

-- cursor already past the requested hour => that hour is full, report why
local requestedWindow = math.floor(notBefore / hourMs)
if math.floor(slot / hourMs) > requestedWindow then
  local b = blockedScope(requestedWindow)
  if b ~= '' then
    deferredBy = b
    blockedWindow = requestedWindow
  end
end

-- walk forward until an hour has room (max 90 days)
for _ = 1, 24 * 90 do
  local window = math.floor(slot / hourMs)
  local sKey = prefix .. 'count:sender:' .. senderId .. ':' .. window
  local cKey = prefix .. 'count:campaign:' .. campaignId .. ':' .. window
  local gKey = prefix .. 'count:global:' .. window
  local blocked = blockedScope(window)

  if blocked == '' then
    local ttl = math.ceil(((window + 2) * hourMs - notBefore) / 1000)
    if ttl < 60 then ttl = 60 end
    redis.call('INCR', sKey); redis.call('EXPIRE', sKey, ttl)
    redis.call('INCR', cKey); redis.call('EXPIRE', cKey, ttl)
    redis.call('INCR', gKey); redis.call('EXPIRE', gKey, ttl)
    redis.call('SET', nextKey, slot + gap, 'PX', (slot + gap - notBefore) + hourMs)
    return { tostring(slot), tostring(window), deferredBy, tostring(blockedWindow) }
  end

  if deferredBy == '' then
    deferredBy = blocked
    blockedWindow = window
  end
  slot = (window + 1) * hourMs
end

return redis.error_reply('rate limiter: no free window within 90 days')
`;

type ReserveFn = (...args: (string | number)[]) => Promise<[string, string, string, string]>;

export class HourlyRateLimiter {
  private readonly reserveCmd: ReserveFn;

  constructor(
    private readonly redis: Redis,
    private readonly opts = {
      prefix: 'rl:',
      minGapMs: config.queue.minDelayBetweenSendsMs,
      senderLimit: config.queue.maxEmailsPerHourPerSender,
      globalLimit: config.queue.maxEmailsPerHourGlobal,
    },
  ) {
    const name = 'reserveEmailSlot';
    if (!(name in redis)) redis.defineCommand(name, { numberOfKeys: 0, lua: RESERVE_LUA });
    this.reserveCmd = (redis as unknown as Record<string, ReserveFn>)[name].bind(redis);
  }

  get limits() {
    return { ...this.opts };
  }

  async reserve(input: ReserveInput): Promise<Reservation> {
    const [slot, window, deferredBy, blockedWindow] = await this.reserveCmd(
      this.opts.prefix,
      input.senderId,
      input.campaignId,
      Math.floor(input.notBefore),
      this.opts.minGapMs,
      this.opts.senderLimit,
      input.campaignHourlyLimit,
      this.opts.globalLimit,
      HOUR_MS,
    );
    return {
      slotAt: Number(slot),
      window: Number(window),
      deferredBy: deferredBy === '' ? null : (deferredBy as LimitScope),
      blockedWindow: Number(blockedWindow) < 0 ? null : Number(blockedWindow),
    };
  }
}

// Initial send times for a campaign. The worker still enforces the shared limits at send time.
export function planSchedule(startMs: number, count: number, delayMs: number, hourlyLimit: number): number[] {
  const out: number[] = [];
  let slot = startMs;
  let window = Math.floor(slot / HOUR_MS);
  let inWindow = 0;
  for (let i = 0; i < count; i++) {
    const w = Math.floor(slot / HOUR_MS);
    if (w !== window) {
      window = w;
      inWindow = 0;
    }
    if (hourlyLimit > 0 && inWindow >= hourlyLimit) {
      window += 1;
      slot = window * HOUR_MS;
      inWindow = 0;
    }
    out.push(slot);
    inWindow++;
    slot += delayMs;
  }
  return out;
}

import 'dotenv/config';

function str(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v === undefined || v === '') {
    if (fallback === undefined) throw new Error(`Missing required env var ${name}`);
    return fallback;
  }
  return v;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) throw new Error(`Env var ${name} must be an integer, got "${raw}"`);
  return n;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export const config = {
  env: str('NODE_ENV', 'development'),
  port: int('PORT', 4000),
  frontendUrl: str('FRONTEND_URL', 'http://localhost:3000'),
  // base URL for OAuth callbacks (the Next.js proxy by default)
  publicApiUrl: str('PUBLIC_API_URL', 'http://localhost:3000'),

  databaseUrl: str('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/reachinbox'),
  redisUrl: str('REDIS_URL', 'redis://localhost:6379'),
  elasticsearchUrl: str('ELASTICSEARCH_URL', 'http://localhost:9200'),
  elasticsearchIndex: str('ELASTICSEARCH_INDEX', 'emails'),

  jwtSecret: str('JWT_SECRET', 'dev-only-change-me'),

  google: {
    clientId: str('GOOGLE_CLIENT_ID', ''),
    clientSecret: str('GOOGLE_CLIENT_SECRET', ''),
  },

  slack: {
    clientId: str('SLACK_CLIENT_ID', ''),
    clientSecret: str('SLACK_CLIENT_SECRET', ''),
  },

  queue: {
    name: str('EMAIL_QUEUE_NAME', 'email-send'),
    workerConcurrency: int('WORKER_CONCURRENCY', 5),
    minDelayBetweenSendsMs: int('MIN_DELAY_BETWEEN_SENDS_MS', 2000),
    maxEmailsPerHourPerSender: int('MAX_EMAILS_PER_HOUR_PER_SENDER', 50),
    // 0 = unlimited
    maxEmailsPerHourGlobal: int('MAX_EMAILS_PER_HOUR', 200),
    maxAttempts: int('EMAIL_MAX_ATTEMPTS', 3),
    runWorkerInApi: bool('RUN_WORKER_IN_API', true),
  },

  senders: {
    etherealSenderCount: int('ETHEREAL_SENDER_COUNT', 3),
  },

  bullBoard: {
    path: str('BULL_BOARD_PATH', '/admin/queues'),
    user: str('BULL_BOARD_USER', ''),
    password: str('BULL_BOARD_PASSWORD', ''),
  },
} as const;

export const isProd = config.env === 'production';

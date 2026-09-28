-- Idempotent schema: safe to run on every boot.

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  google_id    TEXT UNIQUE NOT NULL,
  email        TEXT NOT NULL,
  name         TEXT NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS senders (
  id           SERIAL PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  smtp_host    TEXT NOT NULL,
  smtp_port    INTEGER NOT NULL,
  smtp_secure  BOOLEAN NOT NULL DEFAULT false,
  smtp_user    TEXT NOT NULL,
  smtp_pass    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id         INTEGER NOT NULL REFERENCES senders(id),
  subject           TEXT NOT NULL,
  body              TEXT NOT NULL,
  start_time        TIMESTAMPTZ NOT NULL,
  delay_between_ms  INTEGER NOT NULL,
  hourly_limit      INTEGER NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emails (
  id                  BIGSERIAL PRIMARY KEY,
  campaign_id         INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id           INTEGER NOT NULL REFERENCES senders(id),
  recipient           TEXT NOT NULL,
  subject             TEXT NOT NULL,
  body                TEXT NOT NULL,
  scheduled_at        TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'sending', 'sent', 'failed')),
  attempts            INTEGER NOT NULL DEFAULT 0,
  rate_limited_count  INTEGER NOT NULL DEFAULT 0,
  locked_at           TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  error               TEXT,
  message_id          TEXT,
  preview_url         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The same campaign never contains the same recipient twice.
  UNIQUE (campaign_id, recipient)
);

CREATE INDEX IF NOT EXISTS emails_user_status_sched_idx ON emails (user_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS emails_status_sched_idx ON emails (status, scheduled_at);

CREATE TABLE IF NOT EXISTS slack_connections (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  team_id       TEXT,
  team_name     TEXT,
  channel       TEXT,
  channel_id    TEXT,
  webhook_url   TEXT NOT NULL,
  access_token  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

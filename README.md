# ReachInbox – Full-stack Email Job Scheduler

A production-style email scheduler with a dashboard: schedule campaigns through an API, persist them in Postgres, deliver them at the right time with BullMQ delayed jobs on Redis (no cron), send through Ethereal SMTP from several senders, search them with Elasticsearch, watch the queue live in Bull Board, and get a Slack message the moment a sender hits its hourly limit.

```
.
├── docker-compose.yml     Postgres 16 · Redis 7 (AOF) · Elasticsearch 8
├── backend/               Express + TypeScript API and BullMQ worker
└── frontend/              Next.js 16 (App Router) + Tailwind CSS v4 + TypeScript
```

---

## 1. Quick start

Prerequisites: Node 20+ and Docker.

```bash
# 1. Infra
docker compose up -d                      # postgres :5432, redis :6379, elasticsearch :9200

# 2. Backend
cd backend
cp .env.example .env                      # add GOOGLE_* (required) and SLACK_* (for Slack alerts)
npm install
npm run dev                               # API + in-process worker on http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                               # http://localhost:3000
```

Open http://localhost:3000, sign in with Google, then use Compose.

On first boot the backend creates the schema (idempotent) and provisions `ETHEREAL_SENDER_COUNT` (default 3) Ethereal accounts, stored in the `senders` table. Every sent email has a "View delivered message on Ethereal" link on its detail page.

| URL | What |
| --- | --- |
| http://localhost:3000 | Dashboard (Next.js; proxies `/api/*` to Express) |
| http://localhost:4000/admin/queues | Bull Board – live queue view (also linked from the user menu) |
| http://localhost:4000/api/health | DB / Redis / Elasticsearch health |

### Google OAuth setup
1. Google Cloud Console → *APIs & Services → Credentials → Create OAuth client ID* (Web application).
2. Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`.
3. Put the client id and secret in `backend/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Slack setup (rate-limit notifications)
1. https://api.slack.com/apps → *Create New App* → *From scratch*.
2. *OAuth & Permissions*: add the bot scopes `incoming-webhook` and `chat:write`.
3. Slack only accepts HTTPS redirect URLs, so expose the frontend with a tunnel, e.g. `ngrok http 3000`, and add the redirect URL `https://<tunnel>/api/slack/callback`.
4. In `backend/.env`, set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` and `SLACK_REDIRECT_URI=https://<tunnel>/api/slack/callback`.
5. In the dashboard, open the user menu (top of the sidebar), click Connect Slack, pick a channel, and approve. A confirmation message is posted right away. Use Test to send another.

To see a live alert, set `MAX_EMAILS_PER_HOUR_PER_SENDER=3` and schedule 5 emails from one sender. The 4th email triggers the Slack message.

### Running workers separately (scale out)
```bash
RUN_WORKER_IN_API=false npm run dev       # API only
npm run dev:worker                        # run N of these; all limits are coordinated through Redis
```

### Tests
```bash
cd backend && npm test      # schedule planner, Redis rate limiter (incl. 50 concurrent reservations), recipient parsing
```

---

## 2. Architecture

```
            ┌──────────── Next.js (3000) ────────────┐
 Browser ──►│ UI  ·  /api/* rewrite ─────────────────┼──► Express API (4000) ──► Postgres  (source of truth)
            └────────────────────────────────────────┘        │   │
                                                              │   └──────────► Elasticsearch (search index)
                                           add delayed jobs   ▼
                                                        Redis / BullMQ ◄──── Worker(s) ──► Ethereal SMTP
                                                    (jobs + rate-limit keys)     │
                                                                                 └──► Slack webhook (per user)
```

* Postgres stores users, senders, campaigns, emails (with status, timestamps, attempts, preview URL) and Slack connections.
* BullMQ holds one delayed job per email, with `jobId = email-<id>` and `delay = scheduled_at − now`. Redis's sorted set of delayed jobs is the scheduler. There is no cron and no polling loop.
* Worker (`backend/src/queue/emailWorker.ts`) reserves a rate-limit slot, claims the row, sends, and records the result.
* Elasticsearch indexes every email on create and on every status change. The search box on both tabs queries it: prefix, fuzzy, and matches on recipient, subject, body, and sender. If Elasticsearch is down, search falls back to Postgres `ILIKE` and sending is not affected.
* Auth: Google OAuth 2.0 Authorization Code flow with a CSRF `state`. The backend issues an httpOnly JWT session cookie. Because the frontend proxies `/api`, the cookie is first-party.

### API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/auth/google` → `/callback` | Google OAuth login |
| `GET` | `/api/auth/me`, `POST /api/auth/logout` | Session |
| `GET` | `/api/senders` | Senders + active server limits |
| `POST` | `/api/emails/schedule` | `{ senderId, subject, body, recipients[], startTime, delayBetweenSeconds, hourlyLimit }` |
| `GET` | `/api/emails?status=scheduled\|sent&q=&page=&pageSize=` | List / search (Elasticsearch) |
| `GET` | `/api/emails/counts`, `/api/emails/:id` | Sidebar counts, detail |
| `GET` | `/api/emails/:id/attachments/:attachmentId` | Download an attachment |
| `GET` | `/api/slack/status`, `/connect`, `/callback` | Slack OAuth v2 |
| `POST` / `DELETE` | `/api/slack/test`, `/api/slack` | Test message, disconnect |

---

## 3. Scheduling, persistence and idempotency

Scheduling. `POST /api/emails/schedule` de-duplicates and validates recipients, then plans send times: `start + i × delay`, rolling to the next clock hour whenever the campaign's *hourly limit* is reached. It inserts the campaign and all emails in one transaction (a single `INSERT … SELECT unnest(...)`, so 1000 rows take one round trip). After the commit it `addBulk`s the delayed jobs. Scheduling 1,000 emails takes about 170 ms locally.

Surviving restarts.
* The jobs live in Redis, not in process memory. Redis runs with AOF persistence (`appendonly yes`, `noeviction`) in `docker-compose.yml`. After a restart the worker picks up the delayed set where it left off. Emails whose time passed while the server was down are sent as soon as it's back, and future ones keep their times. Nothing starts over from the beginning.
* On boot, `reconcileQueue()` checks that every email that is still `scheduled` or `sending` in Postgres has a live job. It re-adds any that are missing, which covers a crash between the DB commit and the enqueue, or lost Redis data. Job ids are deterministic, so reconciling never creates duplicates.
* Verified manually: I stopped the API with an email due in 15 s and restarted it 25 s later. The email was sent once, right after the restart.

Idempotency (never send twice).
1. Deterministic job ids (`email-<id>`). BullMQ ignores an `add` for a job id that already exists.
2. The DB row is the source of truth. The worker first reads the row. If it is `sent` or `failed`, the job is a no-op. A replayed job with a *different* id for a sent email returns `skipped:sent`, which I verified.
3. Atomic claim: `UPDATE emails SET status='sending' … WHERE id=$1 AND status='scheduled' RETURNING *`. Only one worker can win.
4. Guarded completion: `UPDATE … SET status='sent' WHERE status='sending'`.
5. The SMTP `Message-ID` is deterministic (`<email-<id>.c<campaign>@reachinbox.scheduler>`), so downstream systems can de-duplicate too.
6. `UNIQUE (campaign_id, recipient)` stops the same lead being added to a campaign twice.

*Known limit:* if a worker crashes after the SMTP server accepted the message but before the `sent` update commits, the row stays `sending`. After a 2-minute stale-lock window the email is re-attempted. That is at-least-once behaviour in a window of a few milliseconds. Removing it entirely would need a transactional outbox at the provider, which SMTP doesn't offer.

---

## 4. Throughput, rate limiting and concurrency

All limits come from env/config. Nothing is hard-coded.

| Setting | Default | Meaning |
| --- | --- | --- |
| `WORKER_CONCURRENCY` | `5` | Parallel jobs per worker process (BullMQ `concurrency`) |
| `MIN_DELAY_BETWEEN_SENDS_MS` | `2000` | Minimum 2 seconds between two emails from the same sender |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `50` | Per-sender cap per clock hour |
| `MAX_EMAILS_PER_HOUR` | `200` | Global cap per clock hour across all senders (`0` = off) |
| Compose → *Hourly Limit* | user input | Extra per-campaign cap per clock hour |
| Compose → *Delay between 2 emails* | user input | Spacing between consecutive emails of a campaign |

### How it's enforced: one atomic Redis Lua script (`backend/src/queue/rateLimiter.ts`)

When a job becomes active, the worker calls `reserve()`. That call runs a Lua script atomically in Redis, so every worker and every instance sees the same state:

* `rl:next:sender:{id}` is a per-sender cursor holding the next free timestamp. Each reservation takes `max(now, cursor)` and advances the cursor by `MIN_DELAY_BETWEEN_SENDS_MS`. This enforces the minimum gap and hands out slots FIFO, so order is preserved.
* `rl:count:sender:{id}:{hourWindow}`, `rl:count:campaign:{id}:{hourWindow}` and `rl:count:global:{hourWindow}` are counters keyed by clock hour (`floor(ts / 1h)`), each with a TTL.
* If the slot's hour is full under any of the three limits, the script moves the slot to the start of the next hour and checks again. When it finds room, it increments all three counters and returns the slot.

The worker then:
* sends immediately if the slot is now, or
* stores the slot on the job (`job.updateData`) and calls `job.moveToDelayed(slot)` + `DelayedError`. The job goes back into BullMQ's persistent delayed set. It is never dropped and never marked failed, and its attempt counter isn't used. The email's `scheduled_at` in Postgres is updated, so the dashboard shows the real send time.

The reservation is stored on the job, so SMTP retries (exponential backoff, `EMAIL_MAX_ATTEMPTS`) and stalled-job recoveries reuse it and don't use up more quota.

Why this design over BullMQ's built-in `limiter`: the built-in limiter is global per queue. It can't express *per-sender* limits, and it has no notion of clock-hour windows or of rolling a job into the *next* hour. Reserving with Lua gives exact, race-free accounting per sender, per campaign, and globally. The unit test runs 50 concurrent reservations against a limit of 10 and confirms nothing is over-allocated.

Trade-offs:
* The counters are fixed clock-hour windows, not sliding windows. That is simple, predictable, and matches "N per hour". A burst can reach 2 × N across an hour boundary.
* Keys are computed inside the script. That works on a single Redis or Sentinel, but Redis Cluster would need hash tags.
* With concurrency > 1, emails that are due at the *same instant* can go out a few ms apart in a slightly different order. Order across hours is preserved.

### Behaviour under load (1000+ emails at the same time)
* At schedule time, the campaign is spread by its delay and hourly limit. For example, 1000 emails with a limit of 200/h become 200 per hour over 5 hours, each 2 s apart. The UI shows these times immediately.
* At send time, when a job becomes due, its sender's cursor and counters decide the real slot. If several campaigns share a sender, or the global cap is hit, the extra emails roll into the next free hour in FIFO order. The worker only ever holds `WORKER_CONCURRENCY` jobs at once. Everything else waits in Redis, which is cheap, so 1000 or 100,000 pending emails cost memory in Redis rather than CPU.
* Nothing is dropped. Deferral is recorded as `rate_limited_count` and shown on the detail page.

### Slack notification on rate-limit hit
* Connect Slack starts the real OAuth v2 flow. The one-time `state` is stored in Redis and bound to the user. The callback exchanges the code with `oauth.v2.access` and saves the per-user incoming webhook and token in `slack_connections`.
* When `reserve()` reports that an email was pushed out of its hour (`deferredBy = sender | campaign | global`), the worker posts a Block Kit message to that user's webhook. The message names the sender, the limit, the hour window, and when sending resumes. A Redis `SET NX` key ensures one message per user, sender, limit and hour rather than one per deferred email.
* Not connected? `notifyUser` finds no row and returns `false`. Nothing crashes, and the dedupe key is released, so connecting later starts notifications right away. The connection is read from the DB on every hit, so connecting or disconnecting takes effect in every worker without a redeploy. If Slack answers that a webhook was revoked, the stale connection is removed and the UI shows Connect Slack again.

---

## 5. Frontend

* Google login (`/login`) → dashboard. The sidebar shows the avatar, name, and email. The user menu holds Slack connect, the queue dashboard link, and Logout.
* Scheduled and Sent tabs. Rows show *To*, a status chip (scheduled time, *Sent*, or *Failed*), and the subject with a body preview. The lists have skeleton loading, empty and error states, debounced Elasticsearch search, a status filter, "Load more" pagination, and refresh in the background every 15 s.
* Compose:
  * From (sender picker) and To (chips, paste, or Upload List for CSV/TXT). Upload parses the file, shows how many addresses were detected, and skips duplicates.
  * Subject, *Delay between 2 emails*, *Hourly Limit*, and a rich-text editor.
  * Send Later popover: date-time picker plus the presets *Tomorrow*, *10 AM*, *11 AM* and *3 PM*. Done schedules the campaign.
* Attachments: the paperclip adds up to 5 files (5 MB total). They are stored per campaign in Postgres and attached to every email of the campaign.
* Email detail: the sanitised HTML body and attachment previews. The "to ..." dropdown shows status, send times, attempts, rate-limit deferrals, and the Ethereal preview link.

```
frontend/src
├── app/                    routes: login, dashboard/{scheduled,sent,compose,email/[id]}
├── components/
│   ├── ui/                 Button, IconButton, inputs, Avatar, StatusBadge, Popover, Toaster, Skeleton, Empty/Error states
│   ├── layout/             Sidebar, UserMenu, SlackConnect
│   ├── emails/             EmailListView, EmailRow, EmailToolbar
│   ├── compose/            RecipientsField, RichTextEditor, SendLaterPopover, FormRow
│   └── icons/
├── context/                AuthContext, ToastContext, CountsContext
├── hooks/                  useAsync, useEmailList, useDebounce, useClickOutside
└── lib/                    api client + types, formatting, CSV lead parsing, HTML sanitiser
```

```
backend/src
├── index.ts / worker.ts    API process (optionally with a worker) / standalone worker
├── app.ts                  Express app, routes, Bull Board
├── config.ts               All env-driven configuration
├── db/                     pg pool, schema.sql, migrate
├── queue/                  emailQueue, emailWorker, rateLimiter (Lua)
├── services/               email (schedule/list/reconcile), sender, slack, search
├── routes/                 auth, emails, senders, slack
└── lib/                    redis, elastic, mailer, logger, recipients
```

> Note on the Figma: the design is followed as closely as possible: the "ONB" sidebar with a user card, Compose, the CORE section with Scheduled/Sent, a search bar, list rows with status chips, the compose form rows, and the Send Later popover. Things the design doesn't show, such as Slack connect and the queue dashboard link, live in the user menu so the layout stays the same.

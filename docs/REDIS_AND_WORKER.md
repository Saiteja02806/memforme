# Redis + BullMQ worker (optional)

When **`REDIS_URL`** is set, write/update/delete memory tools **enqueue** a debounced **`memory-markdown-resync`** job instead of calling Storage sync inline.

You must run a **worker** that consumes that queue, or Storage will lag behind Postgres.

## Option A — same process as the API

Set:

- `REDIS_URL=redis://127.0.0.1:6379` (or your cloud Redis URL)
- `START_REDIS_WORKER_IN_PROCESS=true`

Start the server as usual (`npm start`). One process runs Fastify + BullMQ worker.

## Option B — separate worker process

1. Set `REDIS_URL` on both the API service and the worker service.
2. API: **do not** set `START_REDIS_WORKER_IN_PROCESS`.
3. Worker: from `mcp-server`, run `npm run worker` (same env as API: `SUPABASE_*`, `MEMORY_ENCRYPTION_KEY`).

## Local Redis

```bash
docker compose up -d redis
```

Then point `REDIS_URL` at `redis://127.0.0.1:6379`.

## No Redis

Omit `REDIS_URL`. The server uses **synchronous** `resyncUserMarkdownFiles` (Option A only).

# MCP server — build plan & documentation

This is the **execution plan** for the Cross-Model Memory Layer MCP server, aligned with [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) and [`CrossModelMemoryLayer_v2.pdf`](./CrossModelMemoryLayer_v2.pdf).

---

## Locked decisions (this iteration)

| Topic | Decision |
|--------|-----------|
| **First client** | ChatGPT web (Apps & Connectors / Developer mode) — needs **public HTTPS** |
| **Hosting** | **Railway** — long-lived Node process (good fit for streaming MCP over HTTP) |
| **Auth v1** | **Static API key** (Bearer token) mapped server-side to a user; token is **source of truth** (no `user_id` in tool schemas the model sees) |
| **Browser safety** | **CORS** for OpenAI web origins + follow MCP HTTP security (see below) |
| **Write path v1** | **Option A** — validate → write **directly to Supabase (Postgres)**; Markdown resync to Storage after mutations (**synchronous** unless `REDIS_URL` + worker) |
| **Later** | Redis/BullMQ for **debounced** Storage resync + orchestrator buffers; richer conflict/session automation |

---

## Why this order works

You reduce **parallel risk**: first prove **protocol + auth + one read + one write** against ChatGPT, then add **queues and async markdown** without debugging transport and distributed jobs at the same time.

---

## Stable SDK (pinned for this repo)

| Package | Version | Notes |
|---------|---------|--------|
| `@modelcontextprotocol/sdk` | **1.29.0** (exact pin in `mcp-server/package.json`) | Current **stable 1.x** line on npm — **not** the v2 pre-alpha `main` branch described in some SDK READMEs. |

Upgrade deliberately: read the [release notes](https://github.com/modelcontextprotocol/typescript-sdk/releases) and re-test `POST /mcp` (initialize) + ChatGPT connector after bumping.

---

## Runnable server in this repo (`mcp-server/`)

The MCP app is **wired to Supabase**: encrypted memory tools, `mcp_tokens` auth (Path B + dev fallback), optional **BullMQ** markdown resync when `REDIS_URL` is set, **rate limits** + **body size limit**, **`mcp_tool_audit`** and **`sessions` / `conflicts`** orchestration hooks. See **[`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) §8** for the living checklist.

| Path | Role |
|------|------|
| `mcp-server/src/index.ts` | Fastify, CORS, rate limit, body limit, **`POST` / `GET` / `DELETE` `/mcp`**, optional inline BullMQ worker (`START_REDIS_WORKER_IN_PROCESS`). |
| `mcp-server/src/createMcpServer.ts` | Four tools → Postgres + encrypt/decrypt + scopes + audit + session touch + conflict record on type overlap + retrieval `limit` / `max_chars_per_memory`. |
| `mcp-server/src/crypto/memoryEncryption.ts` | AES-256-GCM → `content_enc` / `content_iv`. |
| `mcp-server/src/storage/markdownSync.ts` | `resyncUserMarkdownFiles` → bucket **`user-memory`**. |
| `mcp-server/src/queue/*` | Optional Redis queue + `npm run worker` for async resync. |
| `mcp-server/src/orchestrator/*` | `sessions` activity + `conflicts` on overlapping type writes. |
| `mcp-server/src/auth/resolveMcpUser.ts` | `mcp_tokens` SHA-256 + dev fallback + `MCP_DISABLE_ENV_FALLBACK` + DB error logging callback. |
| `mcp-server/src/supabase/client.ts` | Service-role `createClient`. |

**Run locally**

```bash
cd mcp-server
npm install
npm run dev
# or: npm run build && npm start
```

From **repo root:** `npm run dev`, `npm run smoke`, `npm run verify`, `npm run hash-token -- "secret"`.

- **Health:** `GET http://localhost:3000/health`
- **MCP endpoint:** `http://localhost:3000/mcp` (paste `https://…/mcp` into ChatGPT when deployed)
- **Production auth (Path B):** register SHA-256 of Bearer secret in **`public.mcp_tokens`**; set **`MCP_DISABLE_ENV_FALLBACK=true`**; see [`docs/DEPLOY_MILESTONE_A.md`](./docs/DEPLOY_MILESTONE_A.md).

**Railway:** root directory **`mcp-server`**, `npm run build` / `npm start`, expose **`PORT`**, set **`SUPABASE_URL`**, **`SUPABASE_SERVICE_ROLE_KEY`**, **`MEMORY_ENCRYPTION_KEY`**, and Path B env as above. Optional: [`mcp-server/railway.toml`](./mcp-server/railway.toml). Optional Redis: [`docs/REDIS_AND_WORKER.md`](./docs/REDIS_AND_WORKER.md).

**Phase 4 web:** [`web/`](./web/) — `npm run web:dev` from repo root.

---

## Clear plan — prove the connector (now that Supabase tools exist)

1. **Lock the SDK** — Keep `@modelcontextprotocol/sdk@1.29.0` unless you have a reason to upgrade; re-run `initialize` after any bump.
2. **Prove `/health`** — Railway or tunnel.
3. **Prove `POST /mcp` initialize** — JSON-RPC `initialize` → **`mcp-session-id`**.
4. **Prove tools** — `tools/list`, `tools/call` for `query_memory` / `write_memory` ([MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) or smoke script).
5. **CORS / Origin** — [`docs/MCP_CLIENT_CONNECTION.md`](./docs/MCP_CLIENT_CONNECTION.md); set **`MCP_EXTRA_CORS_ORIGINS`** for non-default HTTPS origins.
6. **Auth** — Path B: `mcp_tokens` + **`MCP_DISABLE_ENV_FALLBACK`** on deploy; dev: `MCP_BEARER_TOKEN` + `SUPABASE_FALLBACK_USER_ID`. Guide: [`docs/DEPLOY_MILESTONE_A.md`](./docs/DEPLOY_MILESTONE_A.md).
7. **Deploy + ChatGPT** — Public `https://…/mcp` per [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt).
8. **Iterate** — Hardening (rate limits, audit), orchestrator (`sessions` / `conflicts`), optional Redis worker, then Phase 4 [`web/`](./web/).

---

## MCP transport reality check (read this once)

The MCP specification **2025-06-18** defines **Streamable HTTP**: a **single MCP endpoint** that supports **POST** (JSON-RPC) and optionally **GET** (SSE), plus session headers such as `Mcp-Session-Id` and `MCP-Protocol-Version`. Older docs and clients still mention **legacy HTTP+SSE** (older pattern with a dedicated SSE entry and separate message posting).

**What you should do in code**

1. Use whatever transport **`@modelcontextprotocol/sdk`** documents for your **installed version** (today that usually means **Streamable HTTP** on one path, not hand-rolled raw SSE).
2. Follow OpenAI’s **Connect from ChatGPT** guide for the **exact URL** ChatGPT expects (see next section — it is **`/mcp`**, not `/sse`, in current OpenAI docs).
3. If a client only speaks the legacy pattern, you may need **both** patterns during a transition — the spec describes [backwards compatibility](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#backwards-compatibility).

---

## “CliffsNotes” ↔ official docs (verified)

Your **drive-thru** analogy is basically right. Below is how each “book” maps to what the docs **actually** say today, including one important correction.

### Book 1 — OpenAI (how ChatGPT connects)

| Your summary | What the docs say now |
|--------------|------------------------|
| Public **`https://`** | Yes. Local dev uses a tunnel (ngrok, Cloudflare Tunnel, etc.). See [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt). |
| “The door is **`/sse`**” | **Update this:** OpenAI’s connector instructions say to use the public **`/mcp` endpoint**, e.g. `https://abc123.ngrok.app/mcp` — not `/sse`. Same page: *“Connector URL – the public `/mcp` endpoint of your server.”* |
| Bearer token / VIP badge | Yes in spirit: your server must **authenticate** each connection (OAuth or static credentials per [Authentication](https://developers.openai.com/apps-sdk/build/auth)); your plan uses **Bearer → user** on the server. |
| Auto-discovery (`tools/list`) | Yes. After connect, the client learns tools from the MCP server; you still write **clear tool names and descriptions** so the model uses them well. |

So: keep the mental model, but **paste `https://your-host/mcp` into ChatGPT** unless a future doc revision tells you otherwise.

### Book 2 — MCP transport (the “phone line”)

| Your summary | Spec detail (Streamable HTTP) |
|--------------|-------------------------------|
| “SSE = long open line” | **Mostly.** In **Streamable HTTP**, the server may reply to a **POST** with **`text/event-stream`** and stream SSE events **on that request**, then close when the JSON-RPC response is done. There is also an optional **GET** stream for server-initiated messages. See [Transports (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports). |
| “JSON-RPC = walkie-talkie commands” | Yes — MCP messages are **JSON-RPC 2.0** (e.g. `tools/call` with a method name and params). |
| “ChatGPT sends POST” | Yes — clients **POST** JSON-RPC to the MCP endpoint; **GET** may open a separate SSE stream when supported. |

**Simple picture:** one **MCP URL** (today often **`/mcp`**) is the **drive-thru window**. **POST** delivers most orders; sometimes the kitchen keeps the **line open** and streams progress back as **SSE** inside that HTTP design.

### Book 3 — TypeScript SDK (Lego blocks)

| Your summary | Verified notes |
|--------------|----------------|
| SDK hides JSON-RPC + HTTP details | Yes — you wire a **server** instance and **transport** adapters; see examples in the repo. |
| **`SSEServerTransport` on `/sse`** | **Treat as version-specific.** OpenAI’s guide installs **`@modelcontextprotocol/sdk`** and MCP Inspector examples use **`http://localhost:…/mcp`**. Your code should follow the **transport class names and route** from the **exact package version** you pin — names differ between legacy SSE helpers and **Streamable HTTP**. |
| Zod / “bouncer” | Yes — validate tool inputs before DB writes; OpenAI’s build guide shows **`zod`** with the TS SDK. |

### SDK packaging note (important)

- OpenAI [Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server) says: `npm install @modelcontextprotocol/sdk` (and optionally `@modelcontextprotocol/ext-apps` for widget apps).
- The **typescript-sdk** repo **`main`** branch describes **v2 (pre-alpha)** and split packages like `@modelcontextprotocol/server`, while recommending **v1.x for production** with API docs at [ts.sdk.modelcontextprotocol.io](https://ts.sdk.modelcontextprotocol.io/).

**Practical rule:** pin a **specific version** in `package.json`, then read **that** version’s README + [V1 API docs](https://ts.sdk.modelcontextprotocol.io/) (or v2 if you deliberately choose it). Do not assume a symbol named `SSEServerTransport` exists until you check your pinned release.

---

## Security checklist (non-negotiable)

1. **CORS** — Allow only trusted origins (e.g. ChatGPT / OpenAI web); allow `Authorization` and any headers your MCP client sends.
2. **Origin validation** — The Streamable HTTP spec requires servers to **validate the `Origin` header** on inbound connections to reduce **DNS rebinding** risk. Treat this as complementary to CORS, not optional “nice to have.”
3. **Auth** — Every tool handler resolves `user_id` from the **verified** Bearer token; never trust model-supplied identity.
4. **Supabase** — **RLS** on all user tables: `user_id = auth.uid()` (or equivalent) for end-user JWT paths; for service-role server writes, still **enforce** `user_id` from token in application code.
5. **Secrets** — API keys and Supabase service role only in Railway env; never in client bundles.

---

## Full product phases (after the initial stage is green)

The **`mcp-server/`** package already covers an initial slice of phases **1–4** (runtime, Fastify, CORS, Streamable HTTP on `/mcp`, optional Bearer). Everything below is **what comes next** when you add integrations.

### Phase 1 — Repository & runtime

- Node.js **LTS**, **TypeScript** (strict), `pnpm` or `npm`.
- Dependencies: `fastify`, `@fastify/cors`, `@modelcontextprotocol/sdk`, `zod`; add **`@supabase/supabase-js`** only when you wire the database.
- Scripts: `dev` (watch), `build`, `start`; `PORT` from env for Railway.

### Phase 2 — Fastify shell on Railway

- Listen on `0.0.0.0:$PORT`.
- **Health** route (`GET /health`) for Railway checks.
- **Structured logging** (request id, no secrets).

### Phase 3 — CORS + auth middleware

- Register `@fastify/cors` with explicit **origin allowlist** (update when OpenAI documents new hostnames).
- Evolve from env **`MCP_BEARER_TOKEN`** to **per-user tokens** in Supabase: verify Bearer, resolve `user_id`, attach scopes; never trust model-supplied identity.
- Return **401** with a clear body for missing/invalid token.

### Phase 4 — MCP transport wired to Fastify

- **`/mcp`** with `StreamableHTTPServerTransport` + session map (implemented in `mcp-server/src/index.ts`).
- Confirm with **MCP Inspector** and ChatGPT: `initialize` → `mcp-session-id` → `tools/list` → `tools/call`.

### Phase 5 — Tools (contract first, token-scoped)

Define tools **without** `user_id` in the schema. Suggested v1 set (names can match your PDF):

| Tool | v1 behavior |
|------|----------------|
| `query_memory` | Read from Postgres (RLS-safe query path); optional filters for `type` / text search |
| `write_memory` | Validate (length, confidence, source) → **insert** row (status can be `accepted` for now) |
| `update_memory` | Update by `entry_id` **only if** row belongs to `userId` from token |
| `delete_memory` | Soft-delete or hard-delete per schema, same ownership check |

Persist **provenance** now (`source`, `confidence`, timestamps) so Option B (Redis) does not require a redesign.

### Phase 6 — ChatGPT integration

- Deploy to Railway; set **public HTTPS** URL in ChatGPT app settings per [Connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt).
- Test: list tools → run `query_memory` → run `write_memory` → verify row in Supabase.

### Phase 7 — Hardening

- Rate limits per token / per IP (optional v1: simple in-memory sliding window; later Redis).
- Payload size limits, timeouts, consistent JSON-RPC errors.
- Audit log table or structured logs for tool calls (no raw secrets).

### Phase 8 — Option B (after green path)

- Redis + BullMQ: buffer writes, delayed merge, conflict resolution worker.
- Supabase Storage: sync **Markdown** from canonical DB state (or vice versa per final spec).

---

## Documentation to read (in order)

### 1. OpenAI — ChatGPT apps & your server

These are the **product-specific** steps (URLs, auth, connector/app setup). Terminology: **connectors → apps** (Dec 2025).

| Resource | URL |
|----------|-----|
| Apps SDK quickstart | https://developers.openai.com/apps-sdk/quickstart |
| Build your MCP server | https://developers.openai.com/apps-sdk/build/mcp-server |
| Connect from ChatGPT | https://developers.openai.com/apps-sdk/deploy/connect-chatgpt |
| Authentication | https://developers.openai.com/apps-sdk/build/auth |
| MCP servers for ChatGPT / API (incl. `search` / `fetch` for data-only apps) | https://developers.openai.com/api/docs/mcp |

**Note:** If you ship a **custom tool** memory server (not OpenAI vector “company knowledge”), you still follow **connect + auth + transport** from the Apps SDK; the `search`/`fetch` pair is **required for specific OpenAI “data-only” retrieval flows** — confirm whether your ChatGPT app type expects those tools or only your custom tools.

### 2. Model Context Protocol — specification & concepts

| Resource | URL |
|----------|-----|
| Introduction | https://modelcontextprotocol.io/introduction |
| **Transports** (stdio vs Streamable HTTP, SSE, session, security) | https://modelcontextprotocol.io/specification/2025-06-18/basic/transports |
| Lifecycle / initialization | https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle |
| Tools (results as `content` array) | https://modelcontextprotocol.io/specification/2025-06-18/server/tools |
| Docs index for LLMs (`llms.txt`) | https://modelcontextprotocol.io/llms.txt |

### 3. Official TypeScript SDK

| Resource | URL |
|----------|-----|
| npm package (`@modelcontextprotocol/sdk`, per OpenAI Apps SDK) | https://www.npmjs.com/package/@modelcontextprotocol/sdk |
| **V1 API reference (recommended for production until you choose v2)** | https://ts.sdk.modelcontextprotocol.io/ |
| GitHub (examples, issues) | https://github.com/modelcontextprotocol/typescript-sdk |

Read the **README and examples** for the **pinned version** — transport APIs and package layout change between v1 and the v2 `main` branch.

### 4. Fastify & CORS

| Resource | URL |
|----------|-----|
| Fastify | https://fastify.dev/ |
| `@fastify/cors` | https://github.com/fastify/fastify-cors |

### 5. Supabase (when you wire persistence)

| Resource | URL |
|----------|-----|
| Row Level Security | https://supabase.com/docs/guides/auth/row-level-security |
| JavaScript client | https://supabase.com/docs/reference/javascript/introduction |
| Storage (for later Markdown phase) | https://supabase.com/docs/guides/storage |

### 6. Railway

| Resource | URL |
|----------|-----|
| Deploy Node | https://docs.railway.com/guides/nodejs |

---

## Opinion (short)

Your stack choices are coherent: **Railway + Bearer token + CORS + Option A** is the fastest honest path to **ChatGPT ↔ your memory** working in production. After you pin the SDK, confirm **Streamable HTTP** wiring against that version’s examples; use **`/mcp`** in ChatGPT’s connector URL per current OpenAI docs, and use **logs + MCP Inspector** if anything still fails to handshake.

---

## Related files

| File | Role |
|------|------|
| [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) | Problem, architecture, gaps |
| [`mcp-server/`](./mcp-server/) | Runnable MCP (`/mcp`, stub tools, pinned SDK **1.29.0**) |
| [`CrossModelMemoryLayer_v2.pdf`](./CrossModelMemoryLayer_v2.pdf) | Full engineering spec |

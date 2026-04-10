# Memory MCP — connection setup by client

Your **memory product** speaks **Streamable HTTP** on **`POST` / `GET` / `DELETE` `/mcp`**. Each tool or app connects differently: URL, TLS, CORS, and Bearer auth must line up.

---

## Plan (what to do in order)

0. **Production checklist (Path B + ChatGPT + Railway)** — [DEPLOY_MILESTONE_A.md](./DEPLOY_MILESTONE_A.md).

1. **Local server** — `npm run dev` from repo root or `mcp-server/`. If port 3000 is busy, read the log for the real port.
2. **Auth** — Either a row in **`mcp_tokens`** (SHA-256 of your secret) **or** dev fallback **`MCP_BEARER_TOKEN` + `SUPABASE_FALLBACK_USER_ID`** in `mcp-server/.env`.
3. **Smoke** — With **`npm run dev`** running elsewhere: `npm run smoke` from root (or `npm run verify` = **`build` + smoke**). If **`SMOKE_BASE_URL`** is unset, the smoke script **scans** `127.0.0.1:PORT` through `PORT+14` for `/health` (same rule as the server when the port is busy). Override with **`SMOKE_BASE_URL`** when pointing at a tunnel or remote host.

3a. **Inspector / ChatGPT-style flow (automated)** — From repo root, with the server running: **`npm run inspector-flow`**. Set **`MCP_BEARER_TOKEN`** (dev) **or** **`INSPECTOR_BEARER_TOKEN`** / **`MCP_SMOKE_BEARER`** to the **plain Bearer secret** registered in **`mcp_tokens`** (Path B — same as ChatGPT). The script runs **`initialize` → `tools/list` → `tools/call` `write_memory` → `tools/call` `query_memory`**, similar to what MCP Inspector and ChatGPT exercise after connect. Pass **`--chatgpt-origin`** for **`Origin: https://chatgpt.com`** plus an **OPTIONS** preflight to **`/mcp`** (CORS check). For the **official MCP Inspector UI**, run **`npx @modelcontextprotocol/inspector`**, set the server URL to **`http(s)://…/mcp`**, and use the same Bearer secret.

3b. **Supabase memory check** — After ChatGPT or Inspector writes memory: **`npm run verify:supabase`** (uses service role from `.env`) to print **`memory_entries`**, **`mcp_tool_audit`**, and **Storage** `user-memory/{userId}/`. See [DEPLOY_MILESTONE_A.md](./DEPLOY_MILESTONE_A.md) (acceptance section).
4. **Browser-based clients** — If you see **403 Forbidden origin**, add the client’s **Origin** via **`MCP_EXTRA_CORS_ORIGINS`** or enable **`MCP_RELAX_LOCAL_CORS=true`** (localhost only; dev use).
5. **Public HTTPS** — Deploy `mcp-server` (e.g. Railway), set env vars there, add your **`https://…`** origin to **`MCP_EXTRA_CORS_ORIGINS`** if it is not already covered.
6. **ChatGPT** — Connector URL = **`https://your-host/mcp`**, same Bearer secret as registered in **`mcp_tokens`** (or your production auth story).

---

## Two different “MCP”s in this repo

| Name | What it is | How Cursor uses it |
|------|------------|-------------------|
| **Railway** (`@railway/mcp-server`) | stdio MCP for deploy/logs | [`.cursor/mcp.json`](../.cursor/mcp.json) — see [RAILWAY_MCP_CURSOR.md](./RAILWAY_MCP_CURSOR.md) |
| **Memory MCP** (`mcp-server/`) | HTTP MCP for memory tools | **Not** wired in `mcp.json` today — use ChatGPT connector, MCP Inspector, or `curl`/smoke against `http(s)://…/mcp` |

---

## Client cheat sheet

| Client | Base URL | Origin / CORS | Auth |
|--------|-----------|---------------|------|
| **curl / `smoke-test.mjs`** | `http://127.0.0.1:<port>` | Usually **no** `Origin` → allowed | `Authorization: Bearer <secret>` |
| **MCP Inspector** (browser) | Your server `/mcp` | Browser sends **Origin** → must be allowed | Bearer |
| **ChatGPT** (web) | Public **`https://…/mcp`** | `https://chatgpt.com` etc. (built-in defaults) | Bearer (per OpenAI connector) |
| **Tunnel** (ngrok, Cloudflare, etc.) | `https://<tunnel>/mcp` | Add exact **`https://<tunnel>`** to **`MCP_EXTRA_CORS_ORIGINS`** if the UI origin differs |

---

## Environment variables (memory server)

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port (server may use next free port if busy) |
| `SMOKE_BASE_URL` | Only for **smoke script** — must match actual listen URL |
| `MCP_EXTRA_CORS_ORIGINS` | Comma-separated extra **Origin** values (tunnels, custom dev UIs) |
| `MCP_RELAX_LOCAL_CORS` | `true` / `1` — allow **any** `http(s)://localhost` or `127.0.0.1` port (dev only) |
| `MCP_BEARER_TOKEN` + `SUPABASE_FALLBACK_USER_ID` | Dev auth fallback: **both** required; UUID must be a real **`auth.users.id`**; secret is trimmed and outer quotes stripped (same as smoke script) |
| `MCP_DISABLE_ENV_FALLBACK` | Set to **`true`** in production so **only** `public.mcp_tokens` can authorize (Path B). Ignores `MCP_BEARER_TOKEN` / `SUPABASE_FALLBACK_USER_ID` for auth. |

### Bearer auth (why `initialize` can return 401)

The server checks in order:

1. **`public.mcp_tokens`** — `token_hash` must equal **SHA-256** of the **exact** UTF-8 string the client sends after `Bearer ` (hex is **lowercase** from Node; keep inserts lowercase). Row must have **`revoked = false`**. **`user_id`** must reference **`auth.users`**. **`scopes`** drive tool access (`read`, `suggest_write`, or `admin`).

2. **Dev fallback** — only if **`MCP_DISABLE_ENV_FALLBACK`** is **not** set: **`MCP_BEARER_TOKEN`** + valid **`SUPABASE_FALLBACK_USER_ID`**, constant-time compare of the raw Bearer string to the env secret.

On startup the server logs which mode applies and warns about common misconfigurations.

### Path B (production) — implementation checklist

1. **Schema** — Migration already defines **`public.mcp_tokens`** with **`token_hash` UNIQUE**, **`revoked`**, **`scopes`**, FK to **`auth.users`**. RLS applies to **`authenticated`**; the MCP server uses the **service role** key and **bypasses RLS**, so lookups work.

2. **Create a token row** — Pick a strong random **plain** secret (what ChatGPT / the client sends as Bearer). Hash it:
   - **`npm run hash-token -- "<plain-secret>"`** from repo root, **or**
   - SQL: `encode(digest('plain-secret', 'sha256'), 'hex')` in Supabase ([`supabase/seed_mcp_token_example.sql`](../supabase/seed_mcp_token_example.sql)).
   Insert **`user_id`**, **`token_hash`**, optional **`label`**, **`scopes`** (default `read`, `suggest_write`).

3. **Server env (Railway / host)** — Set **`SUPABASE_URL`**, **`SUPABASE_SERVICE_ROLE_KEY`** (service role, not anon). Set **`MCP_DISABLE_ENV_FALLBACK=true`**. **Do not** put the plain MCP secret in env for Path B (only the hash lives in Postgres). Remove **`MCP_BEARER_TOKEN`** and **`SUPABASE_FALLBACK_USER_ID`** from production to avoid confusion.

4. **Client** — Connector / Inspector: **`Authorization: Bearer <same plain secret>`** (the string you hashed, not the hash).

5. **Verify** — Call **`initialize`** with that header; **`last_used_at`** on the row updates on success. Revoke by setting **`revoked = true`** (or delete the row).

**Logic reference (code):** [`mcp-server/src/auth/resolveMcpUser.ts`](../mcp-server/src/auth/resolveMcpUser.ts) — hash incoming token → select by **`token_hash`** + **`revoked=false`** → attach **`user_id`** and **`scopes`** to the MCP session; tools call [`assertScope`](../mcp-server/src/createMcpServer.ts) before DB access.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| **401** on `/mcp` | Missing/wrong Bearer; no **`mcp_tokens`** row; or dev fallback incomplete |
| **403 Forbidden origin** | Browser **Origin** not in allowlist — set **`MCP_EXTRA_CORS_ORIGINS`** or **`MCP_RELAX_LOCAL_CORS=true`** locally |
| Smoke OK, ChatGPT fails | Public URL, CORS, or token not registered for production user |

Server logs include **`explicitCorsCount`** and **`relaxLocalCors`** at startup to confirm CORS mode.

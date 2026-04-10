# Milestone A — Path B + Railway + ChatGPT (checklist)

Follow this to prove **ChatGPT → HTTPS → MCP → Supabase → Storage** for one user.

**Schema:** In Supabase SQL Editor, apply (if not already) [`../supabase/migrations/002_mcp_tool_audit.sql`](../supabase/migrations/002_mcp_tool_audit.sql) for tool audit rows. For the dashboard + Storage, apply [`../supabase/migrations/003_storage_rls_user_memory.sql`](../supabase/migrations/003_storage_rls_user_memory.sql).

## 1. Supabase: register token (Path B)

1. In **Authentication → Users**, copy your user’s **UUID** (`auth.users.id`).
2. Choose a long random **plain secret** (password manager). This is what clients send as `Authorization: Bearer <secret>`.
3. From the repo root:

   ```bash
   npm run hash-token -- "YOUR_PLAIN_SECRET"
   ```

4. In **SQL Editor**, run the printed `INSERT` (replace `YOUR_USER_UUID`). Confirm a row exists in **`public.mcp_tokens`**.

### 1a. Optional: register token via Memforme web (instead of SQL)

If you run the Next.js app, signed-in users can insert their own `mcp_tokens` row (RLS) from **Dashboard → Connect AI** (no SQL Editor required).

1. Copy [`web/.env.example`](../web/.env.example) to `web/.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL` — same project as the MCP server
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **anon** key (not service role)
   - `NEXT_PUBLIC_MCP_SERVER_URL` — public MCP origin **without** trailing slash (e.g. `https://your-service.up.railway.app`)
   - `MEMORY_ENCRYPTION_KEY` — **server-only**; **same value** as on `mcp-server` so **Dashboard → Memory files → Recent memories (Postgres)** can decrypt `memory_entries` via `GET /api/memory-preview`. Omit only if you skip that feature.
2. **Supabase → Authentication → URL configuration:** set **Site URL** to your web app (`http://localhost:3007` for local `npm run web:dev` when using the default port in `web/package.json`). Under **Redirect URLs**, add `http://localhost:3007/auth/callback` and your production web callback URL.
3. **Optional — Google sign-in:** Supabase → **Authentication** → **Providers** → enable **Google** (Client ID / Secret from Google Cloud Console). Same redirect URLs as step 2.
4. From repo root: `npm run web:dev` → sign up or sign in → **Connect AI** → **Generate token & save** (token is created by **`POST /api/generate-token`**, not in the browser) → copy the Bearer secret once → use it in ChatGPT with `${NEXT_PUBLIC_MCP_SERVER_URL}/mcp`.

Developer-only SQL/health helpers live at **`/dev/setup`** and **`/dev/check`** (or legacy redirects from `/setup` and `/check`).

## 2. Railway: deploy `mcp-server`

### 2a. Dashboard-first (recommended if CLI build context is wrong)

The Railway UI makes **root directory** and logs obvious; use it when `railway up` builds from the repo root by mistake.

1. **New service** from your GitHub repo (or empty service + connect repo).
2. **Settings → Source → Root Directory:** set to **`mcp-server`** (required — `package.json` for the server lives there).
3. **Build command:** `npm install && npm run build` (if not auto-detected).
4. **Start command:** `npm start` (runs `node dist/index.js`).
5. **Node:** use **20.x** in `mcp-server/package.json` `engines` or Railway’s Node setting.
6. If an old service failed repeatedly, delete it and create a fresh one rather than fighting stale config.
7. **Variables** tab: add the table below. **Never paste real keys into chat, tickets, or commits.**

`railway open` (CLI) opens the project in the browser; for Cursor’s Railway MCP helper see [RAILWAY_MCP_CURSOR.md](./RAILWAY_MCP_CURSOR.md).

### 2b. Environment variables (Path B)

| Variable | Value |
|----------|--------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Settings → API — not the anon key) |
| `MEMORY_ENCRYPTION_KEY` | 64 hex chars (or app-supported format); **must match** wherever data was encrypted |
| `MCP_DISABLE_ENV_FALLBACK` | `true` |

**Do not set `MCP_BEARER_TOKEN` for production Path B** — with `MCP_DISABLE_ENV_FALLBACK=true` the server **only** accepts Bearer secrets registered in **`public.mcp_tokens`** (SHA-256 of the raw secret from step 1). Leaving `MCP_BEARER_TOKEN` in Railway env is ignored and can confuse you.

**`PORT`:** Railway injects `PORT` automatically. You usually **omit** a custom `PORT` variable; the app reads `process.env.PORT` (see `mcp-server/src/index.ts`).

**CORS:** Set **`MCP_EXTRA_CORS_ORIGINS`** if the browser `Origin` is not already allowed (e.g. `https://chat.openai.com` when needed). Details: [MCP_CLIENT_CONNECTION.md](./MCP_CLIENT_CONNECTION.md).

### 2c. Verify

Open **`https://<railway-host>/health`** — expect `{"ok":true,...}`. MCP URL for ChatGPT: **`https://<railway-host>/mcp`**.

**Optional CLI smoke tests** (replace host and use the **same plain Bearer secret** you registered in `mcp_tokens`):

```bash
curl -sS "https://<railway-host>/health"
curl -sS -X POST "https://<railway-host>/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PLAIN_SECRET_FROM_STEP_1" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0.0"}}}'
```

## 3. ChatGPT connector

1. Use OpenAI’s **Connect from ChatGPT** / Apps SDK docs for your product.
2. **Connector URL:** `https://<your-railway-host>/mcp` (no trailing slash issues — use exact host Railway shows).
3. **Bearer / API key:** the **same plain secret** you hashed in step 1 (not the hex hash).

## 4. Acceptance test

1. In ChatGPT, confirm tools appear (`query_memory`, `write_memory`, etc.).
2. Run **`write_memory`** with a short test string (include `type`, `content`, `source`, `confidence` as the tool expects).
3. Run **`query_memory`** in ChatGPT and confirm the model returns your text.

### 4b. Hands-on verification in the Supabase dashboard

Use the same Supabase project as `SUPABASE_URL` on Railway.

| What to check | Where in dashboard |
|---------------|-------------------|
| **MCP token row** | **Table Editor** → schema **public** → **`mcp_tokens`** → filter **`user_id`** = your Auth user UUID. Expect **`revoked` = false**; **`last_used_at`** updates after successful connects. |
| **Memory rows** | **Table Editor** → **`memory_entries`** → filter **`user_id`**. After `write_memory`, **`is_active` = true**, **`type`** matches what you sent. Payload is encrypted (`content_enc` / `content_iv` — not readable as plain text here). |
| **Versions** (after `update_memory`) | **`memory_versions`** → filter **`user_id`**. |
| **Audit trail** | **`mcp_tool_audit`** (requires migration **002**) → filter **`user_id`**; one row per tool invocation from the server. |
| **Markdown files** | **Storage** → bucket **`user-memory`** → open the folder named exactly your **user UUID** → expect **`stack.md`**, **`preferences.md`**, etc. (one file per type that has active memories). |

### 4c. Scripted check (same credentials as MCP)

From **repo root** (uses `mcp-server/.env`):

```bash
# Resolve user from first arg, or VERIFY_USER_ID / SUPABASE_FALLBACK_USER_ID / first mcp_tokens row
npm run verify:supabase

# Or pass your auth user UUID explicitly
npm run verify:supabase -- 00000000-0000-0000-0000-000000000000

# After you know write_memory succeeded — fails if zero active rows for that user
npm run verify:supabase -- --strict YOUR_USER_UUID
```

`--json` prints a single JSON report for logs or CI.

This does **not** call ChatGPT for you; it confirms **Postgres + Storage** match what the MCP server should have written.

### 4d. Key rotation (re-encrypt existing rows)

If you changed `MEMORY_ENCRYPTION_KEY`, ciphertext written with the **old** key cannot be decrypted with the **new** key until you re-encrypt.

1. In `mcp-server/.env`, set **`OLD_MEMORY_ENCRYPTION_KEY`** (the key that was used when rows were written) and **`NEW_MEMORY_ENCRYPTION_KEY`** (the key you will deploy).
2. From repo root:

   ```bash
   npm run reencrypt-memories -- --dry-run
   npm run reencrypt-memories --
   # Optional — one user only:
   npm run reencrypt-memories -- --user-id=YOUR_AUTH_USER_UUID
   ```

3. Set **`MEMORY_ENCRYPTION_KEY`** on Railway (and locally) to the **same value** as `NEW_MEMORY_ENCRYPTION_KEY`.

The script updates **`memory_entries`** and **`memory_versions`**. It does not rewrite **`public.conflicts`** BYTEA blobs; handle those separately if you use that table.

### 4e. Web app (user onboarding)

The Next app on port **3007** (`npm run web:dev`) includes:

- **Sign up / Sign in** — Supabase Auth (email/password and optional **Google**); same `auth.users.id` as MCP memory and tokens.
- **`/connect`** — public setup checklist (MCP URL, Bearer token, ChatGPT steps); links into the dashboard for token creation.
- **`/dashboard`** — overview; **Connect AI** creates a token via **`POST /api/generate-token`** (see step **1a**); **Tokens** lists/revokes; **Memory files** shows decrypted **Postgres** rows when `MEMORY_ENCRYPTION_KEY` is set, plus Storage markdown under `user-memory/{userId}/` (requires migration **003**).
- **`/dev/setup`** — SQL + hash helper (same as `npm run hash-token`) for admins.
- **`/dev/check`** — server-side `GET /health` proxy for `*.up.railway.app` or `localhost`.

For production, add your deployed web origin to **`MCP_EXTRA_CORS_ORIGINS`** on the MCP server if the browser calls `/mcp` from that origin. Local **`http://localhost:3007`** is in the MCP default CORS list when using the default dev port.

**Production / Vercel:** set the same env vars as `web/.env.example`, including **`MEMORY_ENCRYPTION_KEY`** if you use the Postgres memory preview API.

### 4f. Manual E2E (dashboard + ChatGPT)

1. Complete step **1a** (env + Supabase redirect URLs) and **section 2** (MCP on Railway).
2. Sign up on the web app → **Connect AI** → copy MCP URL and Bearer secret.
3. Configure ChatGPT connector (**section 3** above) with those values.
4. Run **`write_memory`** from ChatGPT → open **Dashboard → Memory files** and confirm `.md` objects appear (or use **4c** `verify:supabase`).

## 5. Troubleshooting

| Symptom | Check |
|---------|--------|
| **Invalid API key** on web sign-in / sign-up | **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** must be the **anon public** JWT from Supabase → Settings → API — **not** `SUPABASE_SERVICE_ROLE_KEY` from `mcp-server/.env`. Restart `npm run web:dev` after fixing `web/.env.local`. |
| 401 on connect | Row in `mcp_tokens`, hash of **exact** Bearer string, `revoked = false`, `MCP_DISABLE_ENV_FALLBACK=true` and no accidental reliance on dev env vars |
| 403 CORS | `MCP_EXTRA_CORS_ORIGINS` includes ChatGPT / tunnel origin |
| 500 on write | `MEMORY_ENCRYPTION_KEY`, service role key, RLS bypass (service role) |
| `query_memory` decrypt failures / bad IV length | Same `MEMORY_ENCRYPTION_KEY` as when data was written; BYTEA transport; or re-encrypt (step **4d** above) after rotation |

Local rehearsal: `npm run dev` + `npm run verify` (see root `package.json`).

# Cross-Model Memory Layer — Project Overview

This document captures **why** we are building this system, **where** data lives, **known design gaps** (in plain language), and **how** the MCP server fits in. It aligns with the detailed engineering spec: [`CrossModelMemoryLayer_v2.pdf`](./CrossModelMemoryLayer_v2.pdf).

---

## 1. The problem you are solving

When you use more than one AI assistant (for example ChatGPT and Claude), **conversations do not travel with you**. Facts, preferences, and decisions you established in one tool are invisible in another. You end up **re-explaining the same context**, which wastes time and drifts from what you actually want remembered.

**Goal:** A **single, user-owned memory layer** that any compatible tool can read and (under rules) suggest updates to—so your context is **portable across models and apps**.

---

## 2. Mental model: database vs files

| Piece | Analogy | Role in this project |
|--------|---------|----------------------|
| **Supabase (PostgreSQL)** | Like structured tables in Excel | Sessions, entries, versions, conflicts, tokens, metadata—**queryable, enforceable rules (e.g. RLS)** |
| **Supabase Storage** | Like Google Drive | **Markdown files**—human-readable “source of truth” blobs, encrypted at rest per the v2 design |

**Flow (simplified):**

```text
User + AI tools
      ↓
MCP server (JSON-RPC over HTTP/SSE — not classic REST)
      ↓
Memory orchestrator (validation, conflicts, sessions, jobs)
      ↓
Supabase
   ├── Database  → structured data, governance
   └── Storage   → Markdown documents (e.g. per user / category)
```

**Example layout (illustrative):** for user `123`, Storage might hold paths such as:

```text
/storage/user_123/stack.md
/storage/user_123/preferences.md
/storage/user_123/decisions.md
```

**Why Markdown?**

- People can read and edit it.
- Models parse it reliably.
- It stays a durable, inspectable format alongside database indexes and versions.

### Product decision: **multiple** Markdown files (not one big file)

We **do not** maintain a single merged `memory.md` as the primary export. Each **category / type** gets its **own file** (e.g. `stack.md`, `preferences.md`, `decisions.md`, and later `goals.md` / `context.md` if used).

**Why (simple):**

- **Smaller, targeted context** — The app or MCP layer can attach **only the file that matches the task** (e.g. stack for coding, preferences for tone). The model does not get a growing wall of unrelated text “just because it grew over time.”
- **Less noise** — One huge file tends to pull **everything** into context even when only one slice is relevant.
- **Flexibility** — New types = new files; permissions or retrieval rules can differ per file later.

The database remains the **source of truth** for queries, versioning, and conflicts; Storage mirrors **several** Markdown objects derived from that truth (dual-write), not one monolith.

---

## 3. Architecture snapshot (from v2 spec)

The PDF describes a **governance system**, not “dump text somewhere”:

- **MCP server** (e.g. Fastify + `@modelcontextprotocol/sdk`): tools like `query_memory`, `write_memory`, `update_memory`, `delete_memory`; **auth via per-connection tokens and scopes**.
- **Orchestrator**: capture rules, session handling, conflict detection/resolution, routing writes through buffers/queues—not always immediate commits.
- **Redis + BullMQ**: session buffers, TTL-style behavior, async jobs (e.g. summarization).
- **Encryption**: per-user keys (e.g. Node crypto + Supabase Vault), TLS in transit, encrypted Storage objects as specified.

**Important protocol note:** MCP uses **JSON-RPC 2.0** (often with **SSE / streamable HTTP**), not a REST CRUD API. Clients discover tools and call them with `tools/call`.

---

## 4. Design gaps — simple explanations and what “done” looks like

These are the main **open or underspecified** areas to close before or while coding.

### Gap 1 — Memory is too flat

**Issue:** Storing only a single string like “User uses Supabase” **loses history**. Reality often has **before / now / scope** (e.g. Firebase for X, Supabase for Y).

**Direction:** Model memory so the system can keep **current vs superseded**, **time or version**, and **why** something changed—not only the latest sentence.

---

### Gap 2 — Who is allowed to write “truth”?

**Issue:** GPT, Claude, the user, and future tools might all **propose** memory. If every proposal is treated as final, **wrong or noisy** entries get persisted.

**Direction (principle):**

```text
AI and clients → suggest / propose
Backend        → validate, merge, queue, enforce policy
User           → final authority when it matters
```

Like: students suggest answers; the **teacher** (your backend + user overrides) decides what goes on the record.

---

### Gap 3 — Conflicts are detected but “what next?” must be crisp

**Issue:** One model says Firebase, another says Supabase. A **conflict table** helps, but the product needs a **resolution path**: auto-merge when confidence and rules allow, otherwise **surface to the user** with a clear choice.

**Direction:** Define explicit states (e.g. open → auto-resolved → user-resolved) and **automation vs human** thresholds.

---

### Gap 4 — “Session” must be defined operationally

**Issue:** “End of session” is vague. Chats stay open; users do not click “goodbye.”

**Direction:** Define session end with **measurable rules**, for example:

- idle timeout (e.g. no activity for N minutes),
- explicit disconnect,
- or app-defined boundaries.

Pick defaults and make them **configurable** where possible.

---

### Gap 5 — Which memories to inject into context?

**Issue:** Many slices exist (stack, preferences, decisions, …). Without **priority, recency, relevance, and token budget**, the model may get **noise** or **wrong emphasis**.

**Direction:** A small, explicit **retrieval policy**: e.g. category filters, recency, importance scores, and “exam answer” style **top-k** selection—not everything at once.

---

## 5. MCP layer — implementation sequence (working plan)

This is the **foundational** step: an MCP server that speaks the protocol your tools expect, then delegates all serious work to the orchestrator.

1. **Project setup** — Node.js + TypeScript; add `@modelcontextprotocol/sdk`, `zod`, and an HTTP server (e.g. **Fastify**) suitable for **SSE / streamable HTTP** as required by the SDK version you use.
2. **Transport + auth (“front door”)** — Routes for MCP connection and message flow; verify **Bearer** (or equivalent) tokens against your `mcp_tokens` (or equivalent) store; attach **scopes** (read vs suggest-write vs admin).
3. **MCP server instance** — Name/version, bound to the transport.
4. **Tool schemas (Zod)** — Strict inputs for `query_memory`, `write_memory`, `update_memory`, `delete_memory` (include **source** and **confidence** on writes as in v2).
5. **Handlers → orchestrator** — Handlers **do not** bypass policy: reads go through fetch/decrypt; writes go through validation and **buffer/queue** when the design says “not direct commit.”
6. **Errors and responses** — Structured failures (rate limits, rejected low-confidence writes); successes as MCP **content** blocks so clients can parse them reliably.

*Note:* Exact transport class names in code (`SSEServerTransport` vs `StreamableHTTPServerTransport`) depend on **SDK version**—implement to match the installed `@modelcontextprotocol/sdk` and official examples.

*V1 shortcut:* For the first ChatGPT-connected release, you may **skip Redis/BullMQ** and commit validated writes **directly to Postgres**; see [`MCP_BUILD_PLAN.md`](./MCP_BUILD_PLAN.md) for phases and security (CORS + `Origin` checks + Bearer token).

---

## 6. One-line summary

> You are building a **smart, encrypted notebook** that **remembers correctly across AI tools**, **updates under rules**, and **asks the user when the system is unsure**.

---

## 7. Suggested next discussions (before heavy coding)

- **Final memory schema** — One structure that handles history, conflicts, and categories (Markdown shape + DB tables).
- **Session policy** — Exact timeouts and events.
- **Retrieval policy** — Ranking, limits, and redaction.
- **MCP scopes** — Which tools exist for read-only assistants vs trusted clients.

---

## 8. Implementation status (living)

Use this section as a **running checklist**. Update it when milestones land (see **§11** and [`.cursor/rules/project-overview-maintenance.mdc`](./.cursor/rules/project-overview-maintenance.mdc)).

### Supabase ↔ Cursor plugin + local CLI (last checked: 2026-04-10)

| Check | Result |
|--------|--------|
| **Canonical Memory project (this repo + Railway)** | **Ref** `veniblkwjhsovicgkkhf` — Supabase dashboard name **`memoryforme`** (your product name may show as **MemoryforMe**). **Do not** run migrations or SQL against **Todaywise** (`gswnffijfmhinavyxitz`). |
| **`npx supabase projects list` + link** | **LINKED (●)** to **`veniblkwjhsovicgkkhf` / `memoryforme`** — matches `mcp-server/.env.example` and Railway `SUPABASE_URL`. Other org projects (e.g. **velocity**) are visible but not linked. |
| **Cursor Supabase MCP (`list_projects`)** | May still show **only Todaywise** if the plugin is signed into a **different** Supabase account — **re-authenticate the plugin** with the **MemoryforMe / memoryforme** account so AI tools don’t target the wrong project. **No Todaywise changes** were made from this repo. |

### Supabase project **memoryforme** (`veniblkwjhsovicgkkhf`) (last checked: 2026-04-10)

| Check | Result |
|--------|--------|
| **Postgres tables (live, read-only `inspect`)** | **Present:** `mcp_tokens`, `memory_entries`, `memory_versions`, `sessions`, `conflicts`, `mcp_tool_audit`, **`oauth_clients`**, **`oauth_authorization_codes`**, **`oauth_access_tokens`**, **`project_facts`**, **`experiences`** (pgvector). OAuth DDL: **`20260410170624_oauth_mcp_handler_schema.sql`**. Cortex DDL: **`20260411172423_cortex_memory_layer.sql`** (`extensions.vector`, HNSW, `search_experiences_for_user`). For OAuth clients with `user_id` null, set MCP env **`OAUTH_AUTHORIZATION_USER_ID`**. |
| **Row counts (live, estimated)** | **`mcp_tokens` ≈ 4**, **`memory_entries` ≈ 3**, **`sessions` ≈ 1**, **`mcp_tool_audit` ≈ 19** — environment is in use; counts change with traffic. |
| **Postgres tables (repo intent)** | **Applied** — `001_initial_schema` + **`002_mcp_tool_audit`** + apply **`003_storage_rls_user_memory`** in SQL Editor for dashboard Storage RLS. |
| **Storage bucket** | **`user-memory`** exists (private). Add **`storage.objects` RLS** for end-user dashboard access when you build the frontend; MCP uses **service role** uploads today. |
| **MCP token row** | You must **insert** at least one `mcp_tokens` row (or use dev **`MCP_BEARER_TOKEN` + `SUPABASE_FALLBACK_USER_ID`**) — see [`supabase/seed_mcp_token_example.sql`](./supabase/seed_mcp_token_example.sql). |
| **Runtime E2E in CI/agent** | **Not run here** — server **requires** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MEMORY_ENCRYPTION_KEY` (and valid Bearer). Without them, process **exits on startup** (verified). |
| **Local smoke test** | From `mcp-server`: start **`npm run dev`**, then **`npm run smoke`** (uses `.env` `MCP_BEARER_TOKEN`). If server bound to **3001+** (port busy), set **`SMOKE_BASE_URL=http://127.0.0.1:<port>`**. |
| **Port busy** | Server tries **`PORT` … `PORT+14`** and logs if it had to shift. |

### MCP server ([`mcp-server/`](./mcp-server/))

| Capability | Status |
|-------------|--------|
| Streamable HTTP **`/mcp`**, sessions, CORS, **rate limit**, **body limit** | Done |
| **Auth** | **`mcp_tokens`** SHA-256 + dev fallback + **`MCP_DISABLE_ENV_FALLBACK`**; **`mcp_tokens` DB errors logged**; session **bound to `user_id`** |
| **`query_memory`** | **Live** — decrypt, `type` / substring `query`, **`limit` (1–100)**, **`max_chars_per_memory`** |
| **`write_memory`** | **Live** — encrypt → insert; **`public.conflicts`** row on overlapping **type** with different text; Storage via **sync or BullMQ** (`REDIS_URL`) |
| **`update_memory`** / **`delete_memory`** | **Live** — version history / soft delete; Storage sync path same as write |
| **Cortex (structured + vector)** | **`store_project_fact`** / **`store_experience`** / **`search_cortex_memory`** in [`mcp-server/src/createMcpServer.ts`](./mcp-server/src/createMcpServer.ts) — OpenAI embeddings ([`mcp-server/src/embeddings/openaiEmbeddings.ts`](./mcp-server/src/embeddings/openaiEmbeddings.ts)), Postgres **`project_facts`** + **`experiences`**. **No Supabase Edge Functions** required for the MCP path (service role + Fastify). |
| **Orchestrator** | **`public.sessions`** touched per tool (`touchCaptureSession`); **`captureBufferKey`** when `REDIS_URL` set |
| **Audit** | **`mcp_tool_audit`** (migration `002`) — best-effort insert per tool call |
| **`markdownSync.ts`** | Per-type `{type}.md` under **`{userId}/`** in **`user-memory`** |
| **Redis / worker** | Optional **`REDIS_URL`** + **`npm run worker`** or **`START_REDIS_WORKER_IN_PROCESS`** — see [`docs/REDIS_AND_WORKER.md`](./docs/REDIS_AND_WORKER.md) |
| **OAuth (direct on MCP host)** | `registerOAuthRoutes` in [`mcp-server/src/index.ts`](./mcp-server/src/index.ts). Discovery uses **`mcpPublicBaseUrl()`** / **`MCP_PUBLIC_URL`** (see [`mcp-server/src/oauth/discovery.ts`](./mcp-server/src/oauth/discovery.ts)); if unset, returns **503** `oauth_metadata_unconfigured`. The old **OAuth issuer bridge** file was **removed** from the repo. |
| **Railway / Railpack** | Deploy from **repository root**: `npm run railway:deploy` (runs `railway up -d` with the full monorepo). Root **`npm run build`** must run **`npm ci --prefix mcp-server --include=dev`** before `tsc` so the image has TypeScript during the build step. |
| **OAuth SQL in repo** | Canonical handler-aligned DDL: **`20260410170624_oauth_mcp_handler_schema.sql`**. Older numeric migrations (`005`/`006`/`20260410170254_*`) may differ; duplicate **`004_oauth_mcp.sql`** was **removed** from the repo to avoid version **`004`** clashes. |
| Env required | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MEMORY_ENCRYPTION_KEY`, **`OPENAI_API_KEY`** (for Cortex tools), optional **`OPENAI_EMBEDDING_MODEL`**, plus token path above |

### Phase 4 — Frontend ([`web/`](./web/))

Minimal **Next.js 15** scaffold (`npm run web:dev` from repo root). Add Supabase Auth + data views when ChatGPT ↔ MCP is stable. Storage RLS for end users: migration **`003_storage_rls_user_memory.sql`**.

---

## 9. Advanced layer — what to build next

**Done in cloud + MCP (Phases 1–3 core):** migration(s), bucket, service-role wiring, four tools, encryption, dual-write to Storage, DB-backed auth, rate limits, optional Redis/BullMQ resync, `sessions`/`conflicts`/`mcp_tool_audit` wiring, Phase 4 [`web/`](./web/) scaffold.

Still open (when you need them):

1. **Storage RLS** — Migration **`003_storage_rls_user_memory.sql`** (apply in Supabase); verify policies for your bucket.
2. **Full Redis orchestration** — PDF-scale buffers / summarization workers beyond markdown resync queue.
3. **Per-user encryption keys (Vault)** — Replace single `MEMORY_ENCRYPTION_KEY` when multi-tenant hardening matters.
4. **Conflict pipeline + capture sessions** — Use `conflicts` and `sessions` tables from orchestration code (not wired in MCP tools yet).
5. **Next.js dashboard** — Phase 4; only after MCP + ChatGPT path is flawless.

---

## 10. Document map

| Document | Purpose |
|----------|---------|
| [`.cursor/mcp.json`](./.cursor/mcp.json) | **Railway** official MCP for Cursor (`@railway/mcp-server`) — deploy/logs; **no secrets in file** |
| [`docs/RAILWAY_MCP_CURSOR.md`](./docs/RAILWAY_MCP_CURSOR.md) | How to log in / set `RAILWAY_TOKEN`; not the same as your memory `mcp-server/` |
| This file | Problem, storage mental model, gaps, MCP roadmap, **living implementation status**, advanced roadmap |
| [`MCP_BUILD_PLAN.md`](./MCP_BUILD_PLAN.md) | Stable SDK pin, **`mcp-server/`** runbook, initial-stage checklist, full product phases, doc links |
| [`mcp-server/`](./mcp-server/) | Fastify MCP, **seven tools** (encrypted memory + Cortex) + Supabase + optional Markdown resync |
| [`supabase/seed_mcp_token_example.sql`](./supabase/seed_mcp_token_example.sql) | Example insert for `mcp_tokens` (SHA-256 of secret) |
| [`mcp-server/src/crypto/memoryEncryption.ts`](./mcp-server/src/crypto/memoryEncryption.ts) | AES-256-GCM for `content_enc` / `content_iv` |
| [`mcp-server/src/storage/markdownSync.ts`](./mcp-server/src/storage/markdownSync.ts) | One **`.md` per memory type** (multi-file sync; not one merged file) |
| [`.cursor/rules/simple-clear-communication.mdc`](./.cursor/rules/simple-clear-communication.mdc) | Reports: simple language, **no omitted facts** |
| [`docs/SUPABASE_SCHEMA.md`](./docs/SUPABASE_SCHEMA.md) | Tables + Storage bucket plan |
| [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql) | Postgres + RLS |
| [`supabase/migrations/002_mcp_tool_audit.sql`](./supabase/migrations/002_mcp_tool_audit.sql) | Tool audit table |
| [`supabase/migrations/003_storage_rls_user_memory.sql`](./supabase/migrations/003_storage_rls_user_memory.sql) | Storage policies for `user-memory` |
| [`supabase/migrations/20260411172423_cortex_memory_layer.sql`](./supabase/migrations/20260411172423_cortex_memory_layer.sql) | **`project_facts`**, **`experiences`** + pgvector HNSW + **`search_experiences_for_user`** |
| [`docs/DEPLOY_MILESTONE_A.md`](./docs/DEPLOY_MILESTONE_A.md) | Path B + Railway + ChatGPT checklist |
| [`docs/REDIS_AND_WORKER.md`](./docs/REDIS_AND_WORKER.md) | Optional BullMQ worker |
| [`web/`](./web/) | Phase 4 Next.js scaffold |
| `CrossModelMemoryLayer_v2.pdf` | Full architecture, tools, stack, encryption, and implementation notes |

When this overview and the PDF disagree, **treat the PDF as the engineering source of truth** and update this file after you change direction.

---

## 11. Cursor rules (project)

| Rule | Purpose |
|------|---------|
| [`.cursor/rules/project-overview-maintenance.mdc`](./.cursor/rules/project-overview-maintenance.mdc) | Keep **§8–§10** in this file updated when Supabase, MCP, or roadmap reality changes. |
| [`.cursor/rules/simple-clear-communication.mdc`](./.cursor/rules/simple-clear-communication.mdc) | After work or reports: explain in **plain language**, **without dropping** names, caveats, or “not done” items (simple wording ≠ fewer facts). |

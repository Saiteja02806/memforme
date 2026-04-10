# Supabase — tables & storage (Cross-Model Memory Layer)

**Live check:** Apply **`001_initial_schema`**, then **`002_mcp_tool_audit.sql`**, then **`003_storage_rls_user_memory.sql`** (Storage policies for the dashboard). Private bucket **`user-memory`** must exist. Insert at least one **`mcp_tokens`** row (or dev fallback envs) before calling the MCP server — see [`../supabase/seed_mcp_token_example.sql`](../supabase/seed_mcp_token_example.sql).

---

This matches your markdown specs ([`PROJECT_OVERVIEW.md`](../PROJECT_OVERVIEW.md), [`MCP_BUILD_PLAN.md`](../MCP_BUILD_PLAN.md)) and the engineering detail in [`CrossModelMemoryLayer_v2.pdf`](../CrossModelMemoryLayer_v2.pdf).  
**Applying schema:** open your Supabase project (“memory”), go to **SQL Editor**, and run [`../supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql). I do not have access to your project URL or keys, so nothing is created automatically from this repo.

---

## 1. Is the MCP server “done”?

**Core memory product path: implemented** in [`mcp-server/`](../mcp-server/) — see [`PROJECT_OVERVIEW.md`](../PROJECT_OVERVIEW.md) §8. Short version:

| Feature | Status |
|--------|--------|
| **Streamable HTTP** on **`/mcp`**, CORS, rate limit, body limit | Implemented |
| **Auth** | `mcp_tokens` (SHA-256) + dev fallback + `MCP_DISABLE_ENV_FALLBACK` |
| **Four tools** | Encrypted CRUD + optional **`mcp_tool_audit`**, **`sessions`**, **`conflicts`** hooks |
| **Storage** | Per-type Markdown under **`{userId}/`** in **`user-memory`** |
| **Optional Redis** | BullMQ resync queue + `npm run worker` |

Remaining work is **connector E2E**, **dashboard UX**, and **PDF-scale** orchestration — not raw “stubs vs DB.”

---

## 2. Postgres tables you need (full v2-aligned set)

From the PDF, these are the **core** tables:

| Table | Purpose |
|-------|--------|
| **`mcp_tokens`** | Maps **hashed** Bearer secrets → `user_id` + `scopes` (read / suggest_write, etc.). Replaces “one static key forever” as you mature. |
| **`memory_entries`** | One row per logical memory fact; **encrypted** payload (`content_enc` + `content_iv`), `type`, `source`, `confidence`, `version`, `is_active`. |
| **`memory_versions`** | Append-only history when content changes (audit + undo + conflict resolution). |
| **`sessions`** | Tracks capture/summarization sessions (`tool_name`, `status`, `buffer_key` for Redis later, `checkpoint_at`). |
| **`conflicts`** | Queue when two models/users disagree; `status` until resolved. |

Types on `memory_entries.type` in the PDF: **`stack`**, **`preferences`**, **`decisions`**, plus **`goals`**, **`context`**. Your current MCP stubs only use the first three; the CHECK constraint includes all five.

**RLS:** Every table uses **`user_id = auth.uid()`** for the `authenticated` role. The **MCP server** will typically use the **service role** key for server-side queries and still **filter by `user_id` resolved from the token** (defense in depth).

**Encryption note:** The migration stores **ciphertext in Postgres** as specified. **Application code** must encrypt/decrypt (e.g. Node crypto + keys from Supabase Vault) before insert/select. Until that exists, you can temporarily add a nullable `content_plaintext` for local experiments only — **not recommended for production**; the migration file sticks to the PDF.

---

## 3. Storage bucket (Markdown “truth files”)

Your overview describes **Markdown files per user**, e.g.:

```text
user_<uuid>/stack.md
user_<uuid>/preferences.md
user_<uuid>/decisions.md
```

**Recommended setup**

1. **Bucket name:** e.g. **`user-memory`** (private).
2. **Path convention:** `{auth.uid()}/stack.md`, `{auth.uid()}/preferences.md`, … (or a `user_<uuid>/` prefix — stay consistent with RLS).
3. **Policies:** Users can only read/write objects whose path starts with their **`auth.uid()`**. Sync from a **trusted server** (service role) when you generate Markdown from `memory_entries`.

Create the bucket in **Storage → New bucket** → **Private**, then add RLS policies on **`storage.objects`** (Supabase docs: [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)).

Example policy idea (adjust to your exact path scheme):

- **SELECT / INSERT / UPDATE / DELETE** for `authenticated` where `bucket_id = 'user-memory'` and `(storage.foldername(name))[1] = auth.uid()::text`.

No bucket is created by the SQL migration file; buckets are configured in the Storage UI or via Supabase Management API.

---

## 4. What to build first vs later

| Now (matches your “Option A”) | Later |
|--------------------------------|--------|
| Create tables + bucket + RLS | Redis/BullMQ buffers, `buffer_key` on `sessions` |
| Wire MCP `write_memory` → insert `memory_entries` (+ optional version row) | Async jobs: Markdown sync → Storage |
| Replace env-only Bearer with **`mcp_tokens`** lookup | pgvector / full-text search, dashboards |

---

## 5. Optional questions for you (only if you want to tweak the schema)

- Do you need **`project_id`** on `memory_entries` (multi-workspace), or single memory space per user for v1?
- For **Markdown in Storage**, do you want **one file per type** (3–5 files) or **one merged** `memory.md`?

If you answer those, the migration can be adjusted in a follow-up revision.

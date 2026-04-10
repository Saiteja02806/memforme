# Phase 2 — OAuth for ChatGPT-aligned MCP auth

Memforme **Phase 1** uses **Path B**: a long-lived **Bearer secret** registered in `public.mcp_tokens` (stored as SHA-256). The Next.js app issues secrets via **`POST /api/generate-token`**; the MCP server resolves them in [`mcp-server/src/auth/resolveMcpUser.ts`](../mcp-server/src/auth/resolveMcpUser.ts).

## Why a second phase

OpenAI’s docs for **ChatGPT apps / remote MCP** recommend **OAuth** (often with **dynamic client registration**) so end users authorize access in a browser instead of pasting a static API key. The **Responses API** also documents an optional `authorization` field (OAuth access token) when using remote MCP by `server_url`.

## What to build (outline)

1. **Authorization server on the web app** (or dedicated auth service):
   - `GET/POST /oauth/authorize` — user must be signed in (Supabase session); issue **authorization code** after consent.
   - `POST /oauth/token` — exchange code (or refresh token) for **access token** (and optional refresh token).
   - **Dynamic client registration** endpoint if required by the ChatGPT / MCP client you target (per current OpenAI + MCP authorization specs).

2. **Persistence** — tables or reuse of `mcp_tokens`-like storage for:
   - OAuth clients (client_id, redirect URIs, public clients vs confidential).
   - Authorization codes (short-lived, single use).
   - Refresh tokens (if used).

3. **MCP server** — extend [`resolveMcpAuth`](../mcp-server/src/auth/resolveMcpUser.ts) to accept:
   - **Existing** `Authorization: Bearer <mcp_tokens secret>` (hash lookup), and
   - **New** Bearer access tokens issued by your OAuth server (verify JWT signature or look up opaque token → `user_id` + scopes).

4. **Security** — HTTPS only, strict redirect URI validation, short code lifetimes, rate limits, and clear separation between **Supabase session** (dashboard) and **MCP access tokens** (ChatGPT).

## References

- OpenAI: [Building MCP servers for ChatGPT Apps and API integrations](https://developers.openai.com/api/docs/mcp) (authentication section).
- OpenAI: [MCP and Connectors](https://developers.openai.com/docs/guides/tools-remote-mcp) (`authorization` on MCP tool).
- Repo: [`docs/MCP_CLIENT_CONNECTION.md`](./MCP_CLIENT_CONNECTION.md) for CORS and Path B troubleshooting.

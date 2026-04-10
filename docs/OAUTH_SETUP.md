# OAuth for MCP (ChatGPT & Claude)

This project implements **OAuth 2.1-style authorization** for MCP: the **MCP HTTP server** advertises a **protected resource** and accepts **Bearer** tokens issued by your **Next.js app** (authorization server). **Manual `mcp_tokens` hashes** remain supported for backward compatibility and tooling.

## Architecture

| Role | Host | Endpoints |
|------|------|-----------|
| **Resource server (MCP)** | Railway `mcp-server` | `GET /.well-known/oauth-protected-resource`, `POST/GET/DELETE /mcp` |
| **Authorization server** | Vercel / your Next deploy | `GET /.well-known/oauth-authorization-server`, `/oauth/register`, `/oauth/authorize`, `/oauth/token`, `/oauth/userinfo` |

## Supabase

1. Apply migration **`004_oauth_mcp.sql`** (creates `oauth_clients`, `oauth_authorization_codes`, `oauth_access_tokens` with RLS; only **service role** can read/write from servers).

## Environment variables

### Next.js (`web`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as today |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as today |
| `NEXT_PUBLIC_MCP_SERVER_URL` | Public MCP origin (no `/mcp`); used to validate the optional `resource` parameter and should match **MCP_PUBLIC_URL** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** — OAuth DB access |
| `OAUTH_ISSUER_URL` | **HTTPS** origin of this Next app (issuer), no trailing slash |
| `OAUTH_ACCESS_TOKEN_TTL_SECONDS` | Optional; default `86400` |
| `OAUTH_REFRESH_TOKEN_TTL_SECONDS` | Optional; default `2592000` (30 days) |

### MCP server (`mcp-server`)

| Variable | Purpose |
|----------|---------|
| `MCP_PUBLIC_URL` | Public **HTTPS** origin of the MCP service (no `/mcp`). If unset, **`https://$RAILWAY_PUBLIC_DOMAIN`** is used on Railway |
| `OAUTH_ISSUER_URL` | Same value as on Next — used in protected-resource metadata and `WWW-Authenticate` |
| Existing `SUPABASE_*`, `MCP_BEARER_TOKEN`, etc. | Unchanged |

## Dynamic client registration

`POST /oauth/register` (RFC 7591-style) with JSON body:

```json
{
  "redirect_uris": ["https://platform.example/callback"],
  "token_endpoint_auth_method": "none",
  "client_name": "ChatGPT"
}
```

Response includes `client_id` (and `client_secret` only if `token_endpoint_auth_method` is `client_secret_post`). Register redirect URIs **exactly** as the platform provides.

## User authorization flow

1. User adds the MCP connector; the host opens **`/oauth/authorize`** with `client_id`, `redirect_uri`, `response_type=code`, PKCE **S256**, `state`, optional `resource` (must match `NEXT_PUBLIC_MCP_SERVER_URL` when set).
2. If not signed in, the user is sent to **`/login?next=...`** and returns after Supabase session is established.
3. The app issues a short-lived **authorization code** and redirects back to the client.
4. The host exchanges the code at **`/oauth/token`** for `access_token` (+ `refresh_token`).
5. MCP calls use `Authorization: Bearer <access_token>`. The MCP server resolves the token via **`oauth_access_tokens.token_hash`** (SHA-256 hex of the raw token), same style as `mcp_tokens`.

## Scopes

Default granted scopes include **`mcp`**, which the MCP server expands to **`read`** and **`suggest_write`** for tool checks. **`openid` / `profile`** control **userinfo** (`email`).

## Deploy

- **Web**: deploy with the new env vars; ensure **`OAUTH_ISSUER_URL`** matches the live URL hosts use for discovery.
- **MCP (Railway)**: set **`MCP_PUBLIC_URL`** and **`OAUTH_ISSUER_URL`**, then e.g. from `mcp-server/`: `railway up` (or your CI).

## Platform notes

- Use each vendor’s connector docs for **exact redirect URIs** and whether they require **PKCE** (this server requires **S256**).
- **ChatGPT / Claude** may need your app or MCP URL **allowlisted** or approved in their developer flows; that process is outside this repo.

## Testing without a host

- **MCP Inspector** / scripts can still use **`mcp_tokens`** or dev **`MCP_BEARER_TOKEN`**.
- Exercise OAuth with `curl` against `/.well-known/oauth-authorization-server`, then register → authorize in a browser while logged into the dashboard.

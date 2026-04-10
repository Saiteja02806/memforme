# Railway MCP in Cursor (this repo)

## What was added

- [`.cursor/mcp.json`](../.cursor/mcp.json) registers the official **`@railway/mcp-server`** (stdio over `npx`), named **`Railway`**.

## Auth (do **not** put tokens in this file)

The Railway MCP server expects the **[Railway CLI](https://docs.railway.com/guides/cli)** to be installed. It authenticates like the CLI:

1. **Interactive:** run `railway login` once on your machine (recommended for local dev).
2. **Token (CI / headless):** set environment variable **`RAILWAY_TOKEN`** to your Railway token. In Cursor, open **Settings → MCP → Railway** and add **`RAILWAY_TOKEN`** in the server’s **Environment** section (or set it in your OS user env before starting Cursor).

**Never commit** a real token into `mcp.json` or any tracked file. If a token was pasted in chat, **rotate/revoke it** in the Railway dashboard and create a new one.

## Prerequisite

- Node.js **≥ 20**
- `railway` CLI on your `PATH` (`npm i -g @railway/cli` or official install)

## Note: two different “MCP”s

| MCP | Role |
|-----|------|
| **Railway** (this file) | Cursor talks to Railway **via stdio** to list projects, deploy, logs, env vars. |
| **`mcp-server/`** in this repo | Your **memory** product: **HTTP Streamable MCP** on `/mcp` for ChatGPT, wired to Supabase. |

They are separate systems.

For **ChatGPT, tunnels, MCP Inspector, and env vars** for the memory HTTP server, see [MCP_CLIENT_CONNECTION.md](./MCP_CLIENT_CONNECTION.md).

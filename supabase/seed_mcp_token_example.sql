-- Path B (production): register one MCP Bearer secret per row (run in SQL Editor after migration).
-- Replace YOUR_USER_UUID with auth.users.id. YOUR_PLAIN_SECRET_TOKEN must be the exact UTF-8 string
-- the client sends as Authorization: Bearer <that string>. Only the hash is stored here.

create extension if not exists pgcrypto;

insert into public.mcp_tokens (user_id, token_hash, label, scopes)
values (
  'YOUR_USER_UUID'::uuid,
  encode(digest('YOUR_PLAIN_SECRET_TOKEN', 'sha256'), 'hex'),
  'chatgpt',
  array['read', 'suggest_write']::text[]
)
on conflict (token_hash) do nothing;

-- Node (must match server): npm run hash-token -- "YOUR_PLAIN_SECRET_TOKEN"
-- Production: set MCP_DISABLE_ENV_FALLBACK=true on the MCP server; do not rely on MCP_BEARER_TOKEN in env.

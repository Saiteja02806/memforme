-- OAuth tables + RPC aligned with mcp-server/src/oauth/* (register, authorize, token, userinfo, clients).
-- Service role (MCP) bypasses RLS. No public SELECT on client_secret_hash.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'write']::text[],
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS oauth_clients_client_id_idx ON public.oauth_clients(client_id);
CREATE INDEX IF NOT EXISTS oauth_clients_user_id_idx ON public.oauth_clients(user_id);

CREATE TABLE IF NOT EXISTS public.oauth_authorization_codes (
  code TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oauth_authorization_codes_client_id_idx ON public.oauth_authorization_codes(client_id);
CREATE INDEX IF NOT EXISTS oauth_authorization_codes_expires_idx ON public.oauth_authorization_codes(expires_at);

CREATE TABLE IF NOT EXISTS public.oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS oauth_access_tokens_token_idx ON public.oauth_access_tokens(access_token);
CREATE INDEX IF NOT EXISTS oauth_access_tokens_user_idx ON public.oauth_access_tokens(user_id);

ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "OAuth clients are public for validation" ON public.oauth_clients;
DROP POLICY IF EXISTS "Users can manage own OAuth clients" ON public.oauth_clients;
DROP POLICY IF EXISTS oauth_clients_authenticated_own ON public.oauth_clients;

CREATE POLICY oauth_clients_authenticated_own ON public.oauth_clients
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own OAuth access tokens" ON public.oauth_access_tokens;
DROP POLICY IF EXISTS "OAuth access tokens are public for validation" ON public.oauth_access_tokens;
DROP POLICY IF EXISTS "OAuth authorization codes are public for validation" ON public.oauth_authorization_codes;

-- Resolve MCP /oauth/clients Bearer → auth.users id (matches public.mcp_tokens SHA-256 secret)
CREATE OR REPLACE FUNCTION public.get_user_by_bearer_token(p_token text)
RETURNS TABLE (id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT mt.user_id AS id
  FROM public.mcp_tokens mt
  WHERE mt.token_hash = encode(extensions.digest(convert_to(trim(p_token), 'UTF8'), 'sha256'), 'hex')
    AND mt.revoked = false
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_by_bearer_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_by_bearer_token(text) TO service_role;

-- OAuth 2.1 for MCP connectors (ChatGPT / Claude). Access only via Supabase service role from Next.js + mcp-server.

CREATE TABLE public.oauth_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  client_secret_hash text,
  redirect_uris text[] NOT NULL DEFAULT '{}',
  grant_types text[] NOT NULL DEFAULT ARRAY['authorization_code']::text[],
  token_endpoint_auth_method text NOT NULL DEFAULT 'none',
  client_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.oauth_authorization_codes (
  code text PRIMARY KEY,
  client_id text NOT NULL REFERENCES public.oauth_clients (client_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  resource text,
  scope text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX oauth_authorization_codes_expires_idx ON public.oauth_authorization_codes (expires_at);

CREATE TABLE public.oauth_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  refresh_token_hash text UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  client_id text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX oauth_access_tokens_lookup_idx ON public.oauth_access_tokens (token_hash)
  WHERE NOT revoked;

ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY oauth_clients_deny_anon_auth ON public.oauth_clients
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY oauth_codes_deny_anon_auth ON public.oauth_authorization_codes
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY oauth_tokens_deny_anon_auth ON public.oauth_access_tokens
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

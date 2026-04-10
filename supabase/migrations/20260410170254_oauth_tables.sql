-- OAuth Tables Migration
-- Create all OAuth-related tables

-- OAuth Clients Table
CREATE TABLE IF NOT EXISTS public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  scopes TEXT[] NOT NULL DEFAULT '{read, write}',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- OAuth Access Tokens Table
CREATE TABLE IF NOT EXISTS public.oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL DEFAULT '{read, write}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false
);

-- OAuth Authorization Codes Table
CREATE TABLE IF NOT EXISTS public.oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope TEXT[] NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS oauth_clients_client_id_idx ON public.oauth_clients(client_id);
CREATE INDEX IF NOT EXISTS oauth_clients_user_id_idx ON public.oauth_clients(user_id);
CREATE INDEX IF NOT EXISTS oauth_access_tokens_token_hash_idx ON public.oauth_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS oauth_access_tokens_client_id_idx ON public.oauth_access_tokens(client_id);
CREATE INDEX IF NOT EXISTS oauth_access_tokens_user_id_idx ON public.oauth_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS oauth_access_tokens_expires_at_idx ON public.oauth_access_tokens(expires_at);
CREATE INDEX IF NOT EXISTS oauth_authorization_codes_code_idx ON public.oauth_authorization_codes(code);
CREATE INDEX IF NOT EXISTS oauth_authorization_codes_client_id_idx ON public.oauth_authorization_codes(client_id);
CREATE INDEX IF NOT EXISTS oauth_authorization_codes_expires_at_idx ON public.oauth_authorization_codes(expires_at);

-- Row Level Security (RLS)
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "OAuth clients are public for validation" ON public.oauth_clients
  FOR SELECT
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "OAuth access tokens are public for validation" ON public.oauth_access_tokens
  FOR SELECT
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "OAuth authorization codes are public for validation" ON public.oauth_authorization_codes
  FOR SELECT
  TO public
  USING (true)
  WITH CHECK (true);

-- Enable RLS for inserts
CREATE POLICY "OAuth clients can be inserted" ON public.oauth_clients
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "OAuth access tokens can be inserted" ON public.oauth_access_tokens
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "OAuth authorization codes can be inserted" ON public.oauth_authorization_codes
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Enable RLS for updates
CREATE POLICY "OAuth clients can be updated" ON public.oauth_clients
  FOR UPDATE
  TO public
  WITH CHECK (true);

CREATE POLICY "OAuth access tokens can be updated" ON public.oauth_access_tokens
  FOR UPDATE
  TO public
  WITH CHECK (true);

-- Enable RLS for deletes
CREATE POLICY "OAuth clients can be deleted" ON public.oauth_clients
  FOR DELETE
  TO public
  WITH CHECK (true);

CREATE POLICY "OAuth access tokens can be deleted" ON public.oauth_access_tokens
  FOR DELETE
  TO public
  WITH CHECK (true);

CREATE POLICY "OAuth authorization codes can be deleted" ON public.oauth_authorization_codes
  FOR DELETE
  TO public
  WITH CHECK (true);
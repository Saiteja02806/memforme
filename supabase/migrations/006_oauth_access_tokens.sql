-- OAuth Access Tokens Table
-- Stores OAuth access tokens issued to clients

CREATE TABLE IF NOT EXISTS public.oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for OAuth access tokens
CREATE INDEX IF NOT EXISTS oauth_access_tokens_token_idx 
  ON public.oauth_access_tokens(access_token);

CREATE INDEX IF NOT EXISTS oauth_access_tokens_client_id_idx 
  ON public.oauth_access_tokens(client_id);

CREATE INDEX IF NOT EXISTS oauth_access_tokens_user_id_idx 
  ON public.oauth_access_tokens(user_id);

CREATE INDEX IF NOT EXISTS oauth_access_tokens_expires_at_idx 
  ON public.oauth_access_tokens(expires_at);

-- Row Level Security (RLS) Policies
ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own OAuth access tokens
CREATE POLICY "Users can manage own OAuth access tokens" ON public.oauth_access_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read access for token validation
CREATE POLICY "OAuth access tokens are public for validation" ON public.oauth_access_tokens
  FOR SELECT
  TO public
  USING (true)
  WITH CHECK (true);

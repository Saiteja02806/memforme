-- OAuth Authorization Codes Table
-- Stores temporary authorization codes for OAuth flow

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

-- Indexes for OAuth authorization codes
CREATE INDEX IF NOT EXISTS oauth_authorization_codes_code_idx 
  ON public.oauth_authorization_codes(code);

CREATE INDEX IF NOT EXISTS oauth_authorization_codes_client_id_idx 
  ON public.oauth_authorization_codes(client_id);

CREATE INDEX IF NOT EXISTS oauth_authorization_codes_expires_at_idx 
  ON public.oauth_authorization_codes(expires_at);

-- Row Level Security (RLS) Policies
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

-- Public access for authorization code validation
CREATE POLICY "OAuth authorization codes are public for validation" ON public.oauth_authorization_codes
  FOR SELECT
  TO public
  USING (true)
  WITH CHECK (true);

-- OAuth Clients Table
-- Stores OAuth client applications that can access the MCP server

CREATE TABLE IF NOT EXISTS public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  redirect_uris TEXT[] NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'write'],
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for OAuth clients
CREATE INDEX IF NOT EXISTS oauth_clients_client_id_idx 
  ON public.oauth_clients(client_id);

CREATE INDEX IF NOT EXISTS oauth_clients_user_id_idx 
  ON public.oauth_clients(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own OAuth clients
CREATE POLICY "Users can manage own OAuth clients" ON public.oauth_clients
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read access for OAuth client validation
CREATE POLICY "OAuth clients are public for validation" ON public.oauth_clients
  FOR SELECT
  TO public
  USING (true)
  WITH CHECK (true);

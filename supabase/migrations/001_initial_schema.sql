-- Cross-Model Memory Layer — initial Postgres schema (aligned with CrossModelMemoryLayer_v2.pdf)
-- Run in Supabase SQL Editor or via supabase db push after linking the project.
-- Requires: Supabase Auth (auth.users).

-- ---------------------------------------------------------------------------
-- 1) MCP connection tokens (Bearer → user + scopes). Store HASH of secret, not raw token.
-- ---------------------------------------------------------------------------
CREATE TABLE public.mcp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, -- hex SHA-256 of "Bearer" secret; server hashes incoming token to match
  label TEXT, -- e.g. "chatgpt-home", "claude-desktop"
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'suggest_write']::TEXT[],
  revoked BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mcp_tokens_user_id_idx ON public.mcp_tokens (user_id);
CREATE INDEX mcp_tokens_token_hash_idx ON public.mcp_tokens (token_hash) WHERE NOT revoked;

ALTER TABLE public.mcp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_tokens_select_own ON public.mcp_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY mcp_tokens_modify_own ON public.mcp_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role (MCP server) bypasses RLS when using supabase service key — still enforce user_id in app code.

-- ---------------------------------------------------------------------------
-- 2) Core memory rows (encrypted payload per v2 spec)
-- ---------------------------------------------------------------------------
CREATE TABLE public.memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id UUID,
  type TEXT NOT NULL CHECK (
    type IN ('stack', 'preferences', 'decisions', 'goals', 'context')
  ),
  content_enc BYTEA NOT NULL,
  content_iv BYTEA NOT NULL,
  source TEXT CHECK (source IN ('model', 'user', 'system')),
  confidence REAL DEFAULT 0.8,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX memory_entries_user_type_active_idx
  ON public.memory_entries (user_id, type)
  WHERE is_active;

ALTER TABLE public.memory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY memory_entries_isolation ON public.memory_entries
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3) Version history per entry
-- ---------------------------------------------------------------------------
CREATE TABLE public.memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.memory_entries (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_enc BYTEA NOT NULL,
  content_iv BYTEA NOT NULL,
  changed_by TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX memory_versions_entry_idx ON public.memory_versions (entry_id);

ALTER TABLE public.memory_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY memory_versions_isolation ON public.memory_versions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4) Conversation / capture sessions (orchestrator + optional Redis buffer_key)
-- ---------------------------------------------------------------------------
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tool_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'summarizing', 'done')),
  buffer_key TEXT,
  checkpoint_at TIMESTAMPTZ
);

CREATE INDEX sessions_user_active_idx ON public.sessions (user_id) WHERE status = 'active';

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_isolation ON public.sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5) Conflict queue
-- ---------------------------------------------------------------------------
CREATE TABLE public.conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entry_id UUID REFERENCES public.memory_entries (id) ON DELETE SET NULL,
  tool_a TEXT,
  value_a_enc BYTEA,
  tool_b TEXT,
  value_b_enc BYTEA,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'auto_resolved', 'user_resolved')
  ),
  resolved_value BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX conflicts_user_pending_idx ON public.conflicts (user_id) WHERE status = 'pending';

ALTER TABLE public.conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY conflicts_isolation ON public.conflicts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- updated_at trigger for memory_entries (optional convenience)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER memory_entries_updated_at
  BEFORE UPDATE ON public.memory_entries
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

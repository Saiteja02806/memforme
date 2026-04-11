-- Cortex-style layer: structured project facts + pgvector experiences (per auth.users).
-- MCP uses service role and must still filter by user_id in application code.
-- Embedding dim 1536 = OpenAI text-embedding-3-small.

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Relational vault: strict rules and tech stack per user + project name
CREATE TABLE IF NOT EXISTS public.project_facts (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  tech_stack JSONB NOT NULL DEFAULT '{}'::jsonb,
  strict_rules TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_name)
);

CREATE INDEX IF NOT EXISTS project_facts_user_id_idx ON public.project_facts (user_id);

-- Vector vault: experiences (no hard FK to project_facts so experiences can be stored before facts)
CREATE TABLE IF NOT EXISTS public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  memory_text TEXT NOT NULL,
  embedding extensions.vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS experiences_user_id_idx ON public.experiences (user_id);
CREATE INDEX IF NOT EXISTS experiences_user_project_idx ON public.experiences (user_id, project_name);

CREATE INDEX IF NOT EXISTS experiences_embedding_hnsw_idx
  ON public.experiences
  USING hnsw (embedding extensions.vector_cosine_ops);

ALTER TABLE public.project_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_facts_own ON public.project_facts;
CREATE POLICY project_facts_own ON public.project_facts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS experiences_own ON public.experiences;
CREATE POLICY experiences_own ON public.experiences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cosine distance operator <=> with vector_cosine_ops index
CREATE OR REPLACE FUNCTION public.search_experiences_for_user(
  p_user_id uuid,
  p_query extensions.vector(1536),
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  project_name text,
  memory_text text,
  distance double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    e.id,
    e.project_name,
    e.memory_text,
    (e.embedding <=> p_query)::double precision AS distance
  FROM public.experiences e
  WHERE e.user_id = p_user_id
  ORDER BY e.embedding <=> p_query
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;

REVOKE ALL ON FUNCTION public.search_experiences_for_user(uuid, extensions.vector(1536), integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_experiences_for_user(uuid, extensions.vector(1536), integer) TO service_role;

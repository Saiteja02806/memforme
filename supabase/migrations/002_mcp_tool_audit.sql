-- MCP tool invocation audit (no request bodies or secrets; service role inserts from mcp-server)

CREATE TABLE public.mcp_tool_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mcp_tool_audit_user_created_idx
  ON public.mcp_tool_audit (user_id, created_at DESC);

ALTER TABLE public.mcp_tool_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcp_tool_audit_isolation ON public.mcp_tool_audit
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Inserts only from service role (MCP server); end users read own rows via policy above.

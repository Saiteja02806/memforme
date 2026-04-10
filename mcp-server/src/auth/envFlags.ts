/**
 * Production Path B: set MCP_DISABLE_ENV_FALLBACK=true so only public.mcp_tokens can authorize.
 */
export function isEnvBearerFallbackDisabled(): boolean {
  const v = process.env.MCP_DISABLE_ENV_FALLBACK?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

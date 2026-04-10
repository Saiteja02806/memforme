import { describeSupabasePublicEnv, type SupabaseEnvStatus } from '@/lib/describe-supabase-env';

export type IntegrationSnapshot = {
  supabase: SupabaseEnvStatus;
  /** Normalized origin (no trailing slash), or null if unset */
  mcpPublicOrigin: string | null;
  /** Full POST URL for MCP clients, e.g. https://host/mcp */
  mcpHttpEndpoint: string | null;
  /** Server-only key present — enables GET /api/memory-preview */
  memoryPreviewConfigured: boolean;
  /** ChatGPT / remote clients need HTTPS; localhost HTTP won't work */
  mcpIsLocalHttp: boolean;
};

/**
 * Readiness signals for the dashboard (no secret values exposed).
 */
export function getIntegrationSnapshot(): IntegrationSnapshot {
  const supabase = describeSupabasePublicEnv();
  const raw = process.env.NEXT_PUBLIC_MCP_SERVER_URL?.trim() ?? '';
  const mcpPublicOrigin = raw ? raw.replace(/\/+$/, '') : null;
  const mcpHttpEndpoint = mcpPublicOrigin ? `${mcpPublicOrigin}/mcp` : null;
  const memoryPreviewConfigured = Boolean(process.env.MEMORY_ENCRYPTION_KEY?.trim());
  const mcpIsLocalHttp = Boolean(
    mcpPublicOrigin &&
      (mcpPublicOrigin.startsWith('http://127.') ||
        mcpPublicOrigin.startsWith('http://localhost') ||
        mcpPublicOrigin.startsWith('http://192.168.') ||
        mcpPublicOrigin.startsWith('http://10.'))
  );

  return {
    supabase,
    mcpPublicOrigin,
    mcpHttpEndpoint,
    memoryPreviewConfigured,
    mcpIsLocalHttp,
  };
}

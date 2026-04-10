import { isEnvBearerFallbackDisabled } from './envFlags.js';
import {
  normalizeEnvBearerSecret,
  normalizeFallbackUserId,
  stripOuterQuotesTrim,
} from './envNormalize.js';

export type McpAuthStartupLine = { level: 'info' | 'warn'; msg: string };

/**
 * Non-secret hints so operators know why Bearer auth might 401 (logged once at boot).
 */
export function getMcpAuthStartupLines(): McpAuthStartupLine[] {
  const lines: McpAuthStartupLine[] = [];
  const prodDbOnly = isEnvBearerFallbackDisabled();
  const bearer = normalizeEnvBearerSecret(process.env.MCP_BEARER_TOKEN);
  const fallbackUser = normalizeFallbackUserId(process.env.SUPABASE_FALLBACK_USER_ID);
  const rawFallback = stripOuterQuotesTrim(process.env.SUPABASE_FALLBACK_USER_ID);

  if (prodDbOnly) {
    lines.push({
      level: 'info',
      msg:
        'MCP_DISABLE_ENV_FALLBACK=true — only public.mcp_tokens (SHA-256) authorizes Bearer tokens (Path B / production mode).',
    });
    if (bearer || rawFallback) {
      lines.push({
        level: 'warn',
        msg:
          'MCP_BEARER_TOKEN / SUPABASE_FALLBACK_USER_ID are present but ignored for auth while MCP_DISABLE_ENV_FALLBACK is set. Remove them from production env to avoid confusion.',
      });
    }
    return lines;
  }

  if (rawFallback && !fallbackUser) {
    lines.push({
      level: 'warn',
      msg:
        'SUPABASE_FALLBACK_USER_ID is set but is not a valid UUID — dev Bearer fallback is disabled. Use auth.users.id from Supabase Dashboard → Authentication → Users.',
    });
  }

  if (bearer && !fallbackUser) {
    lines.push({
      level: 'warn',
      msg:
        'MCP_BEARER_TOKEN is set but dev env fallback is off (missing or invalid SUPABASE_FALLBACK_USER_ID). Auth still works if public.mcp_tokens has SHA-256(Bearer). For local dev without a token row, set SUPABASE_FALLBACK_USER_ID to auth.users.id — or run: npm run hash-token -- "<secret>"',
    });
  }

  if (bearer && fallbackUser) {
    lines.push({
      level: 'info',
      msg:
        'MCP dev Bearer fallback enabled (public.mcp_tokens is still checked first).',
    });
  }

  if (!bearer) {
    lines.push({
      level: 'info',
      msg:
        'MCP_BEARER_TOKEN unset — only public.mcp_tokens (SHA-256) will authorize Bearer requests.',
    });
  }

  return lines;
}

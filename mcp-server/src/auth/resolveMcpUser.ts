import { createHash, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { isEnvBearerFallbackDisabled } from './envFlags.js';
import {
  normalizeEnvBearerSecret,
  normalizeFallbackUserId,
} from './envNormalize.js';
import { authenticateOAuthToken } from '../oauth/auth.js';

export type McpAuthContext = {
  userId: string;
  scopes: string[];
  tokenId: string;
};

function expandOAuthScopes(scopes: string[]): string[] {
  const s = new Set(scopes.map((x) => x.trim()).filter(Boolean));
  if (s.has('mcp')) {
    s.add('read');
    s.add('suggest_write');
  }
  return [...s];
}

/**
 * Resolves Bearer token → user:
 * 1) SHA-256 hex of raw token matched against public.mcp_tokens.token_hash (not revoked)
 * 2) SHA-256 hex matched against public.oauth_access_tokens.token_hash (not revoked, not expired)
 * 3) Optional dev fallback: MCP_BEARER_TOKEN + SUPABASE_FALLBACK_USER_ID (same secret → fixed UUID)
 */
export type McpAuthResolveOptions = {
  /** Called when `mcp_tokens` query fails (network/schema) — distinct from “no matching row”. */
  onDbLookupError?: (message: string, code?: string) => void;
};

export async function resolveMcpAuth(
  supabase: SupabaseClient,
  authHeader: string | undefined,
  request?: FastifyRequest,
  reply?: FastifyReply,
  options?: McpAuthResolveOptions
): Promise<McpAuthContext | null> {
  // Try OAuth token first, then Bearer token
  const oauthAuth = request && reply ? await authenticateOAuthToken(request, reply) : null;
  if (oauthAuth) {
    return {
      userId: oauthAuth.userId,
      scopes: oauthAuth.scopes,
      tokenId: 'oauth-token',
    };
  }

  // Fallback to Bearer token authentication
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  const hash = createHash('sha256').update(token, 'utf8').digest('hex');

  const { data, error } = await supabase
    .from('mcp_tokens')
    .select('id, user_id, scopes')
    .eq('token_hash', hash)
    .eq('revoked', false)
    .maybeSingle();

  if (error) {
    options?.onDbLookupError?.(error.message, error.code);
  }

  if (!error && data) {
    await supabase
      .from('mcp_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);
    return {
      userId: data.user_id,
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
      tokenId: data.id,
    };
  }

  const { data: oat, error: oatErr } = await supabase
    .from('oauth_access_tokens')
    .select('id, user_id, scopes, expires_at')
    .eq('token_hash', hash)
    .eq('revoked', false)
    .maybeSingle();

  if (oatErr) {
    options?.onDbLookupError?.(oatErr.message, oatErr.code);
  }

  if (!oatErr && oat) {
    if (new Date(oat.expires_at).getTime() <= Date.now()) {
      return null;
    }
    return {
      userId: oat.user_id,
      scopes: expandOAuthScopes(Array.isArray(oat.scopes) ? oat.scopes : []),
      tokenId: oat.id,
    };
  }

  // Try OAuth token authentication
  const oauthAuth = await authenticateOAuthToken(request as any, reply as any);
  if (oauthAuth) {
    return {
      userId: oauthAuth.userId,
      scopes: oauthAuth.scopes,
      tokenId: 'oauth-token',
    };
  }

  if (!isEnvBearerFallbackDisabled()) {
    const expected = normalizeEnvBearerSecret(process.env.MCP_BEARER_TOKEN);
    const fallbackUser = normalizeFallbackUserId(
      process.env.SUPABASE_FALLBACK_USER_ID
    );
    if (expected && fallbackUser) {
      const a = Buffer.from(token, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return {
          userId: fallbackUser,
          scopes: ['read', 'suggest_write'],
          tokenId: 'env-fallback',
        };
      }
    }
  }

  return null;
}

export function assertScope(scopes: string[], required: string): void {
  if (scopes.includes('admin')) {
    return;
  }
  if (!scopes.includes(required)) {
    throw new Error(`Missing required scope: ${required}`);
  }
}

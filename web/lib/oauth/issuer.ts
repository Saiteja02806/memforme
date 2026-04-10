import type { NextRequest } from 'next/server';

/** Canonical issuer URL for OAuth metadata (must match what ChatGPT / Claude register). */
export function oauthIssuerBase(request?: NextRequest | Request): string {
  const fromEnv = process.env.OAUTH_ISSUER_URL?.trim().replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
  }
  if (request) {
    return new URL(request.url).origin;
  }
  throw new Error(
    'Set OAUTH_ISSUER_URL to your public web app origin (e.g. https://app.example.com) for OAuth discovery.'
  );
}

export function mcpResourceIdentifier(): string | null {
  const u = process.env.NEXT_PUBLIC_MCP_SERVER_URL?.trim().replace(/\/$/, '');
  return u || null;
}

export function accessTokenTtlSeconds(): number {
  const raw = process.env.OAUTH_ACCESS_TOKEN_TTL_SECONDS?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 60 ? n : 86400;
}

export function refreshTokenTtlSeconds(): number {
  const raw = process.env.OAUTH_REFRESH_TOKEN_TTL_SECONDS?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 3600 ? n : 30 * 24 * 3600;
}

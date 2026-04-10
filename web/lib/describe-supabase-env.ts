/**
 * Server-only checks for Next public Supabase env (no secrets leaked to client beyond what's already NEXT_PUBLIC_*).
 */

import { Buffer } from 'node:buffer';

export type SupabaseEnvStatus =
  | { ok: true }
  | { ok: false; title: string; detail: string };

function decodeJwtPayload(token: string): { role?: string; iss?: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json) as { role?: string; iss?: string };
  } catch {
    return null;
  }
}

/**
 * Call from Server Components / Route Handlers to show setup guidance on auth pages.
 */
export function describeSupabasePublicEnv(): SupabaseEnvStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

  if (!url && !key) {
    return {
      ok: false,
      title: 'Supabase is not configured for this web app',
      detail:
        'Create web/.env.local from web/.env.example and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. These are separate from mcp-server/.env (which uses the service role). Restart next dev after saving.',
    };
  }

  if (!url) {
    return {
      ok: false,
      title: 'Missing NEXT_PUBLIC_SUPABASE_URL',
      detail: 'Add your project URL (e.g. https://xxxx.supabase.co) to web/.env.local.',
    };
  }

  if (!url.startsWith('https://') && !url.startsWith('http://localhost')) {
    return {
      ok: false,
      title: 'NEXT_PUBLIC_SUPABASE_URL must use https',
      detail: `Use your project URL from Supabase → Settings → API (e.g. https://xxxx.supabase.co). Current value starts with: ${url.slice(0, 12)}…`,
    };
  }

  if (!key) {
    return {
      ok: false,
      title: 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY',
      detail:
        'In Supabase Dashboard → Settings → API, copy the anon public key (long JWT), not the service_role secret.',
    };
  }

  const payload = decodeJwtPayload(key);
  if (!payload) {
    return {
      ok: false,
      title: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not a valid JWT',
      detail:
        'The anon key should be three dot-separated segments. Remove quotes/spaces and paste the full key from Settings → API → anon public.',
    };
  }

  if (payload.role === 'service_role') {
    return {
      ok: false,
      title: 'Wrong key: you are using the service role secret in the browser',
      detail:
        'Supabase will return "Invalid API key" for browser auth. Use the anon public key for NEXT_PUBLIC_SUPABASE_ANON_KEY. Keep the service role only in mcp-server (server-side).',
    };
  }

  if (payload.role !== 'anon') {
    return {
      ok: false,
      title: `Unexpected JWT role: ${payload.role ?? 'unknown'}`,
      detail: 'Use the anon public key from Supabase → Settings → API.',
    };
  }

  const segments = key.split('.');
  const sig = segments.length === 3 ? segments[2] : '';
  // Real Supabase HS256 JWTs use a ~43+ char base64url signature; placeholders like ".test" fail API checks.
  if (sig.length < 32) {
    return {
      ok: false,
      title: 'NEXT_PUBLIC_SUPABASE_ANON_KEY looks invalid or like a placeholder',
      detail:
        'Supabase returns "Invalid API key" if the JWT is fake or truncated. In Dashboard → Settings → API, copy the full anon public key (three long segments — not service_role). Paste into web/.env.local, save, then stop and restart npm run web:dev.',
    };
  }

  return { ok: true };
}

import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase-service';
import {
  randomOpaqueToken,
  sha256Hex,
  verifyPkceS256,
} from '@/lib/oauth/crypto';
import {
  accessTokenTtlSeconds,
  refreshTokenTtlSeconds,
} from '@/lib/oauth/issuer';

export const runtime = 'nodejs';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

function oauthJson(
  body: Record<string, string>,
  status: number
): NextResponse {
  return NextResponse.json(body, { status, headers: cors });
}

function parseScopesFromCode(scope: string | null): string[] {
  if (!scope?.trim()) {
    return ['mcp', 'openid', 'profile'];
  }
  return scope.split(/\s+/).filter(Boolean);
}

function safeEqualUtf8(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

async function verifyClient(
  supabase: ReturnType<typeof createServiceSupabase>,
  clientId: string,
  clientSecret: string | null
): Promise<boolean> {
  const { data: c } = await supabase
    .from('oauth_clients')
    .select('token_endpoint_auth_method, client_secret_hash')
    .eq('client_id', clientId)
    .maybeSingle();

  if (!c) {
    return false;
  }

  if (c.token_endpoint_auth_method === 'none') {
    if (clientSecret?.trim()) {
      return false;
    }
    return true;
  }

  if (c.token_endpoint_auth_method === 'client_secret_post') {
    if (!clientSecret || !c.client_secret_hash) {
      return false;
    }
    return safeEqualUtf8(sha256Hex(clientSecret), c.client_secret_hash);
  }

  return false;
}

export async function POST(request: Request) {
  let supabase: ReturnType<typeof createServiceSupabase>;
  try {
    supabase = createServiceSupabase();
  } catch (e) {
    return oauthJson(
      {
        error: 'server_error',
        error_description: e instanceof Error ? e.message : 'Misconfigured',
      },
      503
    );
  }

  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const grantType = params.get('grant_type');
  const clientId = params.get('client_id');
  const clientSecret = params.get('client_secret');

  if (!clientId) {
    return oauthJson(
      { error: 'invalid_request', error_description: 'client_id is required' },
      400
    );
  }

  const clientOk = await verifyClient(supabase, clientId, clientSecret);
  if (!clientOk) {
    return oauthJson(
      { error: 'invalid_client', error_description: 'Invalid client credentials' },
      401
    );
  }

  if (grantType === 'authorization_code') {
    const code = params.get('code');
    const redirectUri = params.get('redirect_uri');
    const codeVerifier = params.get('code_verifier');
    if (!code || !redirectUri || !codeVerifier) {
      return oauthJson(
        {
          error: 'invalid_request',
          error_description: 'code, redirect_uri, and code_verifier are required',
        },
        400
      );
    }

    const { data: row, error: codeErr } = await supabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (codeErr || !row) {
      return oauthJson(
        { error: 'invalid_grant', error_description: 'Unknown or expired code' },
        400
      );
    }

    if (row.client_id !== clientId || row.redirect_uri !== redirectUri) {
      return oauthJson(
        { error: 'invalid_grant', error_description: 'Code does not match client or redirect_uri' },
        400
      );
    }

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await supabase.from('oauth_authorization_codes').delete().eq('code', code);
      return oauthJson(
        { error: 'invalid_grant', error_description: 'Authorization code expired' },
        400
      );
    }

    if (!verifyPkceS256(codeVerifier, row.code_challenge)) {
      return oauthJson(
        { error: 'invalid_grant', error_description: 'Invalid code_verifier' },
        400
      );
    }

    await supabase.from('oauth_authorization_codes').delete().eq('code', code);

    const accessToken = randomOpaqueToken();
    const refreshToken = randomOpaqueToken();
    const scopes = parseScopesFromCode(row.scope);
    const now = Date.now();
    const accessExpires = new Date(
      now + accessTokenTtlSeconds() * 1000
    ).toISOString();
    const refreshExpires = new Date(
      now + refreshTokenTtlSeconds() * 1000
    ).toISOString();

    const { error: insErr } = await supabase.from('oauth_access_tokens').insert({
      token_hash: sha256Hex(accessToken),
      refresh_token_hash: sha256Hex(refreshToken),
      user_id: row.user_id,
      client_id: clientId,
      scopes,
      expires_at: accessExpires,
      refresh_expires_at: refreshExpires,
      revoked: false,
    });

    if (insErr) {
      return oauthJson(
        {
          error: 'server_error',
          error_description: insErr.message,
        },
        500
      );
    }

    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: accessTokenTtlSeconds(),
        refresh_token: refreshToken,
        scope: scopes.join(' '),
      },
      { headers: cors }
    );
  }

  if (grantType === 'refresh_token') {
    const refreshToken = params.get('refresh_token');
    if (!refreshToken) {
      return oauthJson(
        {
          error: 'invalid_request',
          error_description: 'refresh_token is required',
        },
        400
      );
    }

    const rHash = sha256Hex(refreshToken);
    const { data: old, error: oldErr } = await supabase
      .from('oauth_access_tokens')
      .select('*')
      .eq('refresh_token_hash', rHash)
      .eq('revoked', false)
      .maybeSingle();

    if (oldErr || !old) {
      return oauthJson(
        { error: 'invalid_grant', error_description: 'Invalid refresh token' },
        400
      );
    }

    if (old.client_id !== clientId) {
      return oauthJson(
        { error: 'invalid_grant', error_description: 'Refresh token client mismatch' },
        400
      );
    }

    if (new Date(old.refresh_expires_at).getTime() <= Date.now()) {
      return oauthJson(
        { error: 'invalid_grant', error_description: 'Refresh token expired' },
        400
      );
    }

    await supabase.from('oauth_access_tokens').update({ revoked: true }).eq('id', old.id);

    const accessToken = randomOpaqueToken();
    const newRefresh = randomOpaqueToken();
    const scopes = Array.isArray(old.scopes) ? old.scopes : ['mcp', 'openid', 'profile'];
    const now = Date.now();
    const accessExpires = new Date(
      now + accessTokenTtlSeconds() * 1000
    ).toISOString();
    const refreshExpires = new Date(
      now + refreshTokenTtlSeconds() * 1000
    ).toISOString();

    const { error: insErr } = await supabase.from('oauth_access_tokens').insert({
      token_hash: sha256Hex(accessToken),
      refresh_token_hash: sha256Hex(newRefresh),
      user_id: old.user_id,
      client_id: clientId,
      scopes,
      expires_at: accessExpires,
      refresh_expires_at: refreshExpires,
      revoked: false,
    });

    if (insErr) {
      return oauthJson(
        {
          error: 'server_error',
          error_description: insErr.message,
        },
        500
      );
    }

    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: accessTokenTtlSeconds(),
        refresh_token: newRefresh,
        scope: scopes.join(' '),
      },
      { headers: cors }
    );
  }

  return oauthJson(
    { error: 'unsupported_grant_type', error_description: String(grantType) },
    400
  );
}

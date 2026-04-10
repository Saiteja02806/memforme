import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createServiceSupabase } from '@/lib/supabase-service';
import { sha256Hex } from '@/lib/oauth/crypto';

export const runtime = 'nodejs';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === 'https:') {
      return true;
    }
    if (
      u.protocol === 'http:' &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Invalid JSON body' },
      { status: 400, headers: cors }
    );
  }

  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return NextResponse.json(
      {
        error: 'invalid_redirect_uri',
        error_description: 'redirect_uris must be a non-empty array',
      },
      { status: 400, headers: cors }
    );
  }

  for (const u of redirectUris) {
    if (typeof u !== 'string' || !isAllowedRedirectUri(u)) {
      return NextResponse.json(
        {
          error: 'invalid_redirect_uri',
          error_description: `Disallowed redirect URI: ${String(u)}`,
        },
        { status: 400, headers: cors }
      );
    }
  }

  const tokenMethodRaw = body.token_endpoint_auth_method;
  const tokenMethod =
    typeof tokenMethodRaw === 'string' && tokenMethodRaw === 'client_secret_post'
      ? 'client_secret_post'
      : 'none';

  const clientName =
    typeof body.client_name === 'string' ? body.client_name.slice(0, 256) : null;

  const clientId = randomBytes(24).toString('base64url');
  let clientSecret: string | undefined;
  let clientSecretHash: string | null = null;

  if (tokenMethod === 'client_secret_post') {
    clientSecret = randomBytes(32).toString('base64url');
    clientSecretHash = sha256Hex(clientSecret);
  }

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch (e) {
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: e instanceof Error ? e.message : 'Service misconfigured',
      },
      { status: 503, headers: cors }
    );
  }

  const { error } = await supabase.from('oauth_clients').insert({
    client_id: clientId,
    client_secret_hash: clientSecretHash,
    redirect_uris: redirectUris as string[],
    token_endpoint_auth_method: tokenMethod,
    client_name: clientName,
    grant_types: ['authorization_code', 'refresh_token'],
  });

  if (error) {
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: error.message,
      },
      { status: 500, headers: cors }
    );
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    client_id: clientId,
    client_id_issued_at: issuedAt,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: tokenMethod,
    grant_types: ['authorization_code', 'refresh_token'],
  };
  if (clientName) {
    payload.client_name = clientName;
  }
  if (clientSecret) {
    payload.client_secret = clientSecret;
  }

  return NextResponse.json(payload, { status: 201, headers: cors });
}

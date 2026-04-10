import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createServiceSupabase } from '@/lib/supabase-service';
import { randomOpaqueToken } from '@/lib/oauth/crypto';
import { mcpResourceIdentifier } from '@/lib/oauth/issuer';

export const runtime = 'nodejs';

function redirectError(
  redirectUri: string,
  err: string,
  desc: string,
  state: string | null
) {
  try {
    const u = new URL(redirectUri);
    u.searchParams.set('error', err);
    u.searchParams.set('error_description', desc);
    if (state) {
      u.searchParams.set('state', state);
    }
    return NextResponse.redirect(u);
  } catch {
    return new NextResponse(`OAuth error: ${err} — ${desc}`, { status: 400 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const responseType = url.searchParams.get('response_type');
  const state = url.searchParams.get('state');
  const scopeRaw = url.searchParams.get('scope');
  const codeChallenge = url.searchParams.get('code_challenge');
  const codeChallengeMethod = url.searchParams.get('code_challenge_method');
  const resource = url.searchParams.get('resource');

  if (!clientId || !redirectUri || responseType !== 'code') {
    return new NextResponse(
      'Invalid request: client_id, redirect_uri, and response_type=code are required',
      { status: 400 }
    );
  }

  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return new NextResponse(
      'Invalid request: code_challenge (S256) is required',
      { status: 400 }
    );
  }

  const expectedResource = mcpResourceIdentifier();
  if (resource && expectedResource && resource !== expectedResource) {
    return redirectError(
      redirectUri,
      'invalid_target',
      'resource does not match this MCP server',
      state
    );
  }

  let supabaseService;
  try {
    supabaseService = createServiceSupabase();
  } catch (e) {
    return new NextResponse(
      e instanceof Error ? e.message : 'OAuth service misconfigured',
      { status: 503 }
    );
  }

  const { data: client, error: clientErr } = await supabaseService
    .from('oauth_clients')
    .select('client_id, redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle();

  if (clientErr || !client) {
    return new NextResponse('Unknown client_id', { status: 400 });
  }

  const allowed = Array.isArray(client.redirect_uris)
    ? client.redirect_uris.includes(redirectUri)
    : false;
  if (!allowed) {
    return new NextResponse('redirect_uri is not registered for this client', {
      status: 400,
    });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', url.origin);
    login.searchParams.set('next', `${url.pathname}${url.search}`);
    return NextResponse.redirect(login);
  }

  const code = randomOpaqueToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insErr } = await supabaseService.from('oauth_authorization_codes').insert({
    code,
    client_id: clientId,
    user_id: user.id,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    resource: resource || null,
    scope: scopeRaw || null,
    expires_at: expiresAt,
  });

  if (insErr) {
    return redirectError(
      redirectUri,
      'server_error',
      'Could not create authorization code',
      state
    );
  }

  const dest = new URL(redirectUri);
  dest.searchParams.set('code', code);
  if (state) {
    dest.searchParams.set('state', state);
  }
  return NextResponse.redirect(dest);
}

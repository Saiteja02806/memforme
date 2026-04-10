import { NextResponse } from 'next/server';
import { oauthIssuerBase } from '@/lib/oauth/issuer';

export async function GET(request: Request) {
  let base: string;
  try {
    base = oauthIssuerBase(request);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'issuer_unconfigured' },
      { status: 503 }
    );
  }

  const doc = {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    userinfo_endpoint: `${base}/oauth/userinfo`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    scopes_supported: ['openid', 'profile', 'mcp'],
  };

  return NextResponse.json(doc, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}

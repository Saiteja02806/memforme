import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase-service';
import { sha256Hex } from '@/lib/oauth/crypto';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  let supabase: ReturnType<typeof createServiceSupabase>;
  try {
    supabase = createServiceSupabase();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Misconfigured' },
      { status: 503 }
    );
  }

  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const token = auth.slice(7).trim();
  const hash = sha256Hex(token);

  const { data: row } = await supabase
    .from('oauth_access_tokens')
    .select('user_id, scopes, expires_at, revoked')
    .eq('token_hash', hash)
    .maybeSingle();

  if (
    !row ||
    row.revoked ||
    new Date(row.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const scopes = Array.isArray(row.scopes) ? row.scopes : [];
  const wantEmail =
    scopes.includes('email') ||
    scopes.includes('profile') ||
    scopes.includes('openid');

  const { data: admin, error: adminErr } =
    await supabase.auth.admin.getUserById(row.user_id);

  if (adminErr || !admin.user) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const payload: Record<string, unknown> = { sub: row.user_id };
  if (wantEmail && admin.user.email) {
    payload.email = admin.user.email;
  }

  return NextResponse.json(payload);
}

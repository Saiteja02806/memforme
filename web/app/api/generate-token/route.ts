import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let label = 'connection';
    try {
      const body = (await request.json().catch(() => ({}))) as { label?: unknown };
      if (typeof body.label === 'string' && body.label.trim()) {
        label = body.label.trim().slice(0, 120);
      }
    } catch {
      /* ignore invalid JSON */
    }

    const secret = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(secret, 'utf8').digest('hex');

    const { error: insErr } = await supabase.from('mcp_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      label,
      scopes: ['read', 'suggest_write'],
    });

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    return NextResponse.json({ token: secret, label });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { byteaToBuffer } from '@/lib/server/bytea';
import {
  decryptMemoryContentWithKey,
  getMemoryEncryptionKey,
} from '@/lib/server/memoryDecrypt';

export type MemoryPreviewItem = {
  id: string;
  type: string;
  created_at: string;
  text: string | null;
  decrypt_error?: string;
};

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let key: ReturnType<typeof getMemoryEncryptionKey>;
    try {
      key = getMemoryEncryptionKey();
    } catch {
      return NextResponse.json(
        {
          error:
            'Memory preview is not configured. Set MEMORY_ENCRYPTION_KEY on the web server (same value as mcp-server).',
        },
        { status: 503 }
      );
    }

    const url = new URL(request.url);
    const rawLimit = parseInt(url.searchParams.get('limit') ?? '30', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 30;

    const { data: rows, error: qErr } = await supabase
      .from('memory_entries')
      .select('id, type, content_enc, content_iv, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 400 });
    }

    const memories: MemoryPreviewItem[] = (rows ?? []).map((row) => {
      try {
        const enc = byteaToBuffer(row.content_enc);
        const iv = byteaToBuffer(row.content_iv);
        const text = decryptMemoryContentWithKey(enc, iv, key);
        return {
          id: row.id,
          type: row.type,
          created_at: row.created_at,
          text,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          id: row.id,
          type: row.type,
          created_at: row.created_at,
          text: null,
          decrypt_error: msg,
        };
      }
    });

    return NextResponse.json({ memories });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

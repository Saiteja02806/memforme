/**
 * Dual-write path: Postgres remains canonical; Storage holds **multiple** Markdown files per user (one per type).
 * Product decision: **no** single merged `memory.md` — so retrieval can pick e.g. only `stack.md` or `preferences.md` and avoid stuffing all history into one context.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { byteaToBuffer } from '../crypto/bytea.js';
import { decryptMemoryContent } from '../crypto/memoryEncryption.js';

export const USER_MEMORY_BUCKET = 'user-memory';

export type MemoryExportRow = {
  type: string;
  content_plaintext: string;
  updated_at?: string;
};

/**
 * Groups active memories by `type` and builds one Markdown string per type (e.g. stack.md body).
 */
export function buildMarkdownByType(rows: MemoryExportRow[]): Record<string, string> {
  const byType: Record<string, string[]> = {};
  for (const r of rows) {
    const line = r.updated_at
      ? `- (${r.updated_at}) ${r.content_plaintext}`
      : `- ${r.content_plaintext}`;
    (byType[r.type] ??= []).push(line);
  }
  const out: Record<string, string> = {};
  for (const [type, lines] of Object.entries(byType)) {
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    out[`${type}.md`] = `# ${title}\n\n${lines.join('\n')}\n`;
  }
  return out;
}

/**
 * Object paths inside the bucket: `{userId}/stack.md`, etc.
 */
export function storageObjectPath(userId: string, filename: string): string {
  const safe = filename.replace(/[^a-z0-9._-]/gi, '');
  return `${userId}/${safe}`;
}

/**
 * Rebuilds all per-type `.md` objects under `{userId}/` from active encrypted rows (decrypt in app).
 */
export async function resyncUserMarkdownFiles(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('memory_entries')
    .select('type, content_enc, content_iv, updated_at')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.length) {
    return;
  }

  const rows: MemoryExportRow[] = [];
  for (const row of data) {
    rows.push({
      type: row.type,
      content_plaintext: decryptMemoryContent(
        byteaToBuffer(row.content_enc),
        byteaToBuffer(row.content_iv)
      ),
      updated_at: row.updated_at ?? undefined,
    });
  }

  const files = buildMarkdownByType(rows);
  for (const [filename, body] of Object.entries(files)) {
    const path = storageObjectPath(userId, filename);
    const { error: upErr } = await supabase.storage.from(USER_MEMORY_BUCKET).upload(path, body, {
      upsert: true,
      contentType: 'text/markdown; charset=utf-8',
    });
    if (upErr) {
      throw new Error(upErr.message);
    }
  }
}

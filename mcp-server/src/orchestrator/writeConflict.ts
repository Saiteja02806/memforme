import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptMemoryContent } from '../crypto/memoryEncryption.js';
import { packEncryptedPayload } from '../crypto/packEncrypted.js';

/**
 * When a new memory of the same type would coexist with different existing text, record public.conflicts.
 * Does not block the write (multiple rows per type are allowed).
 */
export async function recordTypeOverlapConflict(params: {
  supabase: SupabaseClient;
  userId: string;
  entryId: string;
  existingPlaintext: string;
  incomingPlaintext: string;
}): Promise<void> {
  const a = params.existingPlaintext.trim();
  const b = params.incomingPlaintext.trim();
  if (!a || !b || a === b) {
    return;
  }
  const max = 8000;
  const pa = encryptMemoryContent(a.slice(0, max));
  const pb = encryptMemoryContent(b.slice(0, max));
  const { error } = await params.supabase.from('conflicts').insert({
    user_id: params.userId,
    entry_id: params.entryId,
    tool_a: 'existing_memory',
    tool_b: 'write_memory',
    value_a_enc: packEncryptedPayload(pa),
    value_b_enc: packEncryptedPayload(pb),
    status: 'pending',
  });
  if (error) {
    throw new Error(`conflicts insert: ${error.message}`);
  }
}

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Tracks capture activity in public.sessions (orchestrator v1).
 * One active row per user: refresh last_active_at or insert new.
 */
export async function touchCaptureSession(
  supabase: SupabaseClient,
  userId: string,
  toolName: string,
  bufferKey: string | null
): Promise<void> {
  const { data: active, error: selErr } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('last_active_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selErr) {
    throw new Error(`sessions lookup: ${selErr.message}`);
  }

  const now = new Date().toISOString();
  if (active) {
    const { error: updErr } = await supabase
      .from('sessions')
      .update({ last_active_at: now, tool_name: toolName })
      .eq('id', active.id);
    if (updErr) {
      throw new Error(`sessions update: ${updErr.message}`);
    }
    return;
  }

  const { error: insErr } = await supabase.from('sessions').insert({
    user_id: userId,
    tool_name: toolName,
    status: 'active',
    last_active_at: now,
    buffer_key: bufferKey,
  });
  if (insErr) {
    throw new Error(`sessions insert: ${insErr.message}`);
  }
}

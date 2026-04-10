import type { SupabaseClient } from '@supabase/supabase-js';

export async function recordToolAudit(
  supabase: SupabaseClient,
  row: { userId: string; tokenId: string; toolName: string }
): Promise<void> {
  const { error } = await supabase.from('mcp_tool_audit').insert({
    user_id: row.userId,
    token_id: row.tokenId,
    tool_name: row.toolName,
  });
  if (error) {
    throw new Error(`mcp_tool_audit: ${error.message}`);
  }
}

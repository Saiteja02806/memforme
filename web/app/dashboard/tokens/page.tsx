import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import { TokenList, type TokenRow } from './TokenList';

export default async function TokensPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('mcp_tokens')
    .select('id, label, created_at, last_used_at, revoked')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main className="page">
        <h1>Tokens</h1>
        <p className="form-error">Could not load tokens: {error.message}</p>
      </main>
    );
  }

  const initial = (data ?? []) as TokenRow[];

  return (
    <main className="page">
      <h1>MCP tokens</h1>
      <p className="lede muted">
        Secrets are never shown again after creation. Revoke a token if a client was compromised.
      </p>
      <TokenList initial={initial} />
    </main>
  );
}

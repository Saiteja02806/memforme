import Link from 'next/link';
import { IntegrationChecklist } from '@/components/IntegrationChecklist';
import { createServerSupabase } from '@/lib/supabase-server';

export default async function DashboardHomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="page dashboard-home">
      <div className="welcome-block">
        <h1>Welcome back</h1>
        <p className="lede welcome-lede">
          You&apos;re signed in as <strong>{user?.email ?? user?.id}</strong>. Use the checklist below to
          confirm this app and your MCP server are pointed at the same Supabase project and encryption key.
        </p>
      </div>

      <IntegrationChecklist />

      <h2 className="section-title text-lg" style={{ marginTop: '2rem' }}>
        Where to go next
      </h2>
      <ul className="card-list">
        <li className="card card-elevated">
          <Link href="/connect">Full setup guide</Link>
          <p className="muted">Step-by-step: account, MCP URL, Bearer token, ChatGPT.</p>
        </li>
        <li className="card card-elevated">
          <Link href="/dashboard/connect">Connect AI tools</Link>
          <p className="muted">Generate a Bearer token (server-side) and copy your connector URL.</p>
        </li>
        <li className="card card-elevated">
          <Link href="/dashboard/tokens">Manage tokens</Link>
          <p className="muted">See labels, revoke old connections.</p>
        </li>
        <li className="card card-elevated">
          <Link href="/dashboard/memory">Memory</Link>
          <p className="muted">Postgres preview + Storage markdown from the MCP server.</p>
        </li>
      </ul>
    </main>
  );
}

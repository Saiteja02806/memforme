import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase-server';

function mcpEndpoint(): string {
  const base = process.env.NEXT_PUBLIC_MCP_SERVER_URL?.trim().replace(/\/+$/, '') ?? '';
  return base ? `${base}/mcp` : '';
}

export default async function ConnectPage() {
  const mcpUrl = mcpEndpoint();
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mcpIsLocalHttp =
    mcpUrl.startsWith('http://127.') ||
    mcpUrl.startsWith('http://localhost') ||
    mcpUrl.startsWith('http://192.168.') ||
    mcpUrl.startsWith('http://10.');

  return (
    <main className="page connect-guide max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Connect ChatGPT &amp; MCP</h1>
      <p className="lede muted mb-4">
        One checklist: deploy the MCP server, create a Bearer token tied to your Memforme account, then
        register the connector in ChatGPT (or use the API / other clients).
      </p>
      {mcpUrl && mcpIsLocalHttp ? (
        <div className="callout callout-warning mb-8" role="status">
          <strong>ChatGPT needs a public HTTPS URL.</strong> A URL like <code className="inline">http://127.0.0.1:3000/mcp</code>{' '}
          works for local tools (curl, MCP Inspector) only. Deploy <code className="inline">mcp-server</code> to
          Railway (or run a tunnel such as ngrok / Cloudflare Tunnel), then set{' '}
          <code className="inline">NEXT_PUBLIC_MCP_SERVER_URL</code> in <code className="inline">web/.env.local</code> to
          that <strong>https</strong> origin and restart the web dev server.
        </div>
      ) : mcpUrl && !mcpIsLocalHttp ? (
        <p className="muted small mb-8">
          Your configured URL looks public. Use the MCP link below in ChatGPT; if the connector fails, check CORS on
          the server (<code className="inline">MCP_EXTRA_CORS_ORIGINS</code>).
        </p>
      ) : (
        <p className="muted small mb-8">
          Set <code className="inline">NEXT_PUBLIC_MCP_SERVER_URL</code> in <code className="inline">web/.env.local</code>{' '}
          so this page can show the exact connector URL (see section 2).
        </p>
      )}

      <section className="mb-10 space-y-3">
        <h2 className="section-title text-xl">1. Account</h2>
        <p className="muted">
          Your Supabase user id links MCP tokens and encrypted <code className="inline">memory_entries</code>{' '}
          rows.
        </p>
        {user ? (
          <p className="flex flex-wrap gap-2 items-center">
            <span className="muted">Signed in.</span>
            <Link href="/dashboard/connect" className="btn primary">
              Generate MCP token
            </Link>
            <Link href="/dashboard" className="btn">
              Dashboard
            </Link>
          </p>
        ) : (
          <p className="flex flex-wrap gap-2">
            <Link href="/login" className="btn primary">
              Sign in
            </Link>
            <Link href="/signup" className="btn">
              Create account
            </Link>
          </p>
        )}
      </section>

      <section className="mb-10 space-y-3">
        <h2 className="section-title text-xl">2. MCP server URL</h2>
        <p className="muted">
          Public HTTPS origin of <code className="inline">mcp-server</code> (e.g. Railway). The web app reads{' '}
          <code className="inline">NEXT_PUBLIC_MCP_SERVER_URL</code> for display only.
        </p>
        {mcpUrl ? (
          <div className="panel border border-slate-200 rounded-lg p-4 bg-slate-50">
            <p className="muted text-sm mt-0">Paste as the connector / MCP URL:</p>
            <pre className="mono wrap text-sm mb-2">{mcpUrl}</pre>
          </div>
        ) : (
          <p className="form-error">
            Set <code className="inline">NEXT_PUBLIC_MCP_SERVER_URL</code> in <code className="inline">web/.env.local</code>{' '}
            (no trailing slash).
          </p>
        )}
      </section>

      <section className="mb-10 space-y-3">
        <h2 className="section-title text-xl">3. Bearer token</h2>
        <ol className="steps list-decimal pl-5 space-y-2 muted">
          <li>
            Open <Link href="/dashboard/connect">Dashboard → Connect AI</Link> (requires sign-in).
          </li>
          <li>
            Click <strong>Generate token &amp; save</strong> — the plain secret is shown once and stored only
            as a SHA-256 hash in <code className="inline">mcp_tokens</code>.
          </li>
          <li>
            In your client, set <code className="inline">Authorization: Bearer &lt;secret&gt;</code> (not the
            hash).
          </li>
        </ol>
      </section>

      <section className="mb-10 space-y-3">
        <h2 className="section-title text-xl">4. ChatGPT (Apps &amp; Connectors)</h2>
        <ol className="steps list-decimal pl-5 space-y-2 muted">
          <li>Enable developer mode if your workspace allows it (Settings → Apps &amp; Connectors → Advanced).</li>
          <li>Create an app / connector and paste the MCP URL above.</li>
          <li>When prompted for auth, use the Bearer secret from the dashboard (Path B).</li>
          <li>Refresh the connector after you change tools or descriptions on the server.</li>
        </ol>
        <p className="muted small">
          CORS and troubleshooting: <code className="inline">docs/MCP_CLIENT_CONNECTION.md</code>. OpenAI may
          recommend full OAuth for some flows — see <code className="inline">docs/OAUTH_PHASE2.md</code>.
        </p>
      </section>

      <p className="muted small">
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}

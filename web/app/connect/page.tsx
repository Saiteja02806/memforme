import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase-server';

function mcpEndpoint(): string {
  const base = process.env.NEXT_PUBLIC_MCP_SERVER_URL?.trim().replace(/\/+$/, '') ?? '';
  return base ? `${base}/mcp` : '';
}

function oauthIssuerBase(): string {
  return process.env.OAUTH_ISSUER_URL?.trim().replace(/\/+$/, '') ?? '';
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
        Deploy the MCP server, then connect ChatGPT or Claude using <strong>OAuth</strong> (recommended for
        hosted connectors) or a <strong>dashboard Bearer token</strong> (manual / MCP Inspector). See{' '}
        <code className="inline">docs/OAUTH_SETUP.md</code> for OAuth env vars and registration.
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

      {oauthIssuerBase() ? (
        <section className="mb-10 space-y-3">
          <h2 className="section-title text-xl">3. OAuth (authorization server)</h2>
          <p className="muted">
            This app is configured as the OAuth issuer (<code className="inline">OAUTH_ISSUER_URL</code>).
            ChatGPT / Claude discover metadata here, register a client, and send users through{' '}
            <code className="inline">/oauth/authorize</code> (Memforme sign-in). The MCP server accepts the
            resulting access token on <code className="inline">/mcp</code> alongside legacy{' '}
            <code className="inline">mcp_tokens</code> Bearer secrets.
          </p>
          <div className="panel border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2">
            <p className="muted text-sm mt-0 mb-0">Discovery (authorization server metadata):</p>
            <pre className="mono wrap text-sm mb-0">
              {`${oauthIssuerBase()}/.well-known/oauth-authorization-server`}
            </pre>
            <p className="muted text-sm mb-0">Dynamic registration:</p>
            <pre className="mono wrap text-sm mb-0">POST {`${oauthIssuerBase()}/oauth/register`}</pre>
            <p className="muted text-sm mt-2 mb-0">
              Requires <code className="inline">SUPABASE_SERVICE_ROLE_KEY</code> on this Next.js deployment and
              migration <code className="inline">004_oauth_mcp.sql</code> applied in Supabase.
            </p>
          </div>
        </section>
      ) : (
        <section className="mb-10 space-y-3">
          <h2 className="section-title text-xl">3. OAuth (optional)</h2>
          <p className="muted">
            To use OAuth with ChatGPT or Claude, deploy this web app with{' '}
            <code className="inline">OAUTH_ISSUER_URL</code>, <code className="inline">SUPABASE_SERVICE_ROLE_KEY</code>
            , and apply <code className="inline">004_oauth_mcp.sql</code>. Set{' '}
            <code className="inline">OAUTH_ISSUER_URL</code> and <code className="inline">MCP_PUBLIC_URL</code> on the
            MCP server. Full steps: <code className="inline">docs/OAUTH_SETUP.md</code>.
          </p>
        </section>
      )}

      <section className="mb-10 space-y-3">
        <h2 className="section-title text-xl">4. Bearer token (manual)</h2>
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
        <h2 className="section-title text-xl">5. ChatGPT / Claude (Apps &amp; Connectors)</h2>
        <ol className="steps list-decimal pl-5 space-y-2 muted">
          <li>Enable developer mode if your workspace allows it (Settings → Apps &amp; Connectors → Advanced).</li>
          <li>Create an app / connector and paste the MCP URL above.</li>
          <li>
            {oauthIssuerBase() ? (
              <>
                When prompted for auth, use <strong>OAuth</strong> if the host supports it (discovery URL in
                section 3), or paste the <strong>Bearer</strong> secret from the dashboard (section 4).
              </>
            ) : (
              <>
                When prompted for auth, use the Bearer secret from the dashboard (section 4), or configure OAuth
                (section 3).
              </>
            )}
          </li>
          <li>Refresh the connector after you change tools or descriptions on the server.</li>
        </ol>
        <p className="muted small">
          CORS: <code className="inline">docs/MCP_CLIENT_CONNECTION.md</code>. OAuth env and registration:{' '}
          <code className="inline">docs/OAUTH_SETUP.md</code>.
        </p>
      </section>

      <p className="muted small">
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}

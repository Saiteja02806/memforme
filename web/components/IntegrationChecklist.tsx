import Link from 'next/link';
import { getIntegrationSnapshot } from '@/lib/integration-status';

function Row({
  ok,
  title,
  children,
}: {
  ok: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="integration-row panel">
      <div className="integration-row-head">
        <span className={ok ? 'badge badge-on' : 'badge badge-off'}>{ok ? 'Ready' : 'Needs attention'}</span>
        <strong>{title}</strong>
      </div>
      <div className="integration-row-body muted small">{children}</div>
    </li>
  );
}

/**
 * Server component: shows what is configured vs missing (friendly onboarding).
 */
export function IntegrationChecklist() {
  const s = getIntegrationSnapshot();

  const supabaseOk = s.supabase.ok;
  const mcpUrlOk = Boolean(s.mcpHttpEndpoint);
  const memoryOk = s.memoryPreviewConfigured;

  return (
    <section className="integration-checklist stack" aria-labelledby="integration-status-heading">
      <h2 id="integration-status-heading" className="section-title text-lg">
        Your setup at a glance
      </h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        These checks only look at environment variables for this Next.js app — not whether Railway is up.
        Use them to catch typos (for example <code className="inline">MCP_SERVER_URL</code> vs{' '}
        <code className="inline">NEXT_PUBLIC_MCP_SERVER_URL</code>).
      </p>
      <ul className="integration-list">
        <Row ok={supabaseOk} title="Supabase (sign-in &amp; dashboard)">
          {supabaseOk ? (
            <>Anon key and project URL look valid.</>
          ) : (
            <>
              {!s.supabase.ok ? s.supabase.detail : 'Fix environment variables.'}{' '}
              See <Link href="/login">login</Link> page banner or <code className="inline">web/.env.example</code>.
            </>
          )}
        </Row>
        <Row ok={mcpUrlOk} title="MCP server URL (for connector + copy buttons)">
          {mcpUrlOk ? (
            <>
              Showing <code className="inline">{s.mcpHttpEndpoint}</code> from <code className="inline">NEXT_PUBLIC_MCP_SERVER_URL</code>{' '}
              (pasted by you — Railway never sends this to the app automatically).
              {s.mcpIsLocalHttp ? (
                <>
                  {' '}
                  <strong className="integration-warn-strong">ChatGPT cannot reach your laptop.</strong> Deploy to Railway
                  (or similar) and put that <strong>https</strong> origin here, or use ngrok / Cloudflare Tunnel
                  and paste the tunnel URL. See <Link href="/connect">setup guide</Link>.
                </>
              ) : null}
            </>
          ) : (
            <>
              Set <code className="inline">NEXT_PUBLIC_MCP_SERVER_URL</code> in <code className="inline">web/.env.local</code>{' '}
              to your public MCP origin (no trailing slash), e.g. <code className="inline">https://xxx.up.railway.app</code>.
              Restart <code className="inline">npm run web:dev</code> after saving.
            </>
          )}
        </Row>
        <Row ok={memoryOk} title="Postgres memory preview (decrypt in dashboard)">
          {memoryOk ? (
            <>
              <code className="inline">MEMORY_ENCRYPTION_KEY</code> is set — &quot;Recent memories (Postgres)&quot; can
              decrypt rows written by the MCP server.
            </>
          ) : (
            <>
              Add <code className="inline">MEMORY_ENCRYPTION_KEY</code> to <code className="inline">web/.env.local</code>{' '}
              with the <strong>same value</strong> as in <code className="inline">mcp-server/.env</code>. Without it,
              Storage markdown may still work, but decrypted Postgres preview will show an error.
            </>
          )}
        </Row>
      </ul>
      <p className="muted small integration-footnote">
        <strong>Memories go with the Bearer token.</strong> If you use a token from{' '}
        <Link href="/dashboard/connect">Connect AI</Link>, writes use <em>your</em> logged-in user. A separate dev{' '}
        <code className="inline">MCP_BEARER_TOKEN</code> in <code className="inline">mcp-server/.env</code> uses{' '}
        <code className="inline">SUPABASE_FALLBACK_USER_ID</code> instead — a different user id. Use one consistent
        path so the dashboard and ChatGPT see the same memories.
      </p>
    </section>
  );
}

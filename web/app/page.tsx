import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page">
      <h1>Memforme</h1>
      <p className="lede">
        Cross-model memory behind one MCP server. Sign in, open the{' '}
        <Link href="/connect">setup guide</Link> when you&apos;re ready to wire ChatGPT or another client — the
        dashboard shows whether your URLs and keys line up.
      </p>

      <div className="hero-cta">
        <Link href="/signup" className="btn primary hero-btn">
          Get started
        </Link>
        <Link href="/login" className="btn hero-btn-secondary">
          Sign in
        </Link>
      </div>

      <h2 className="section-title">How it works</h2>
      <ol className="steps">
        <li>
          <strong>Account</strong> — Sign up (Supabase Auth). Your user id ties tokens and memory
          together.
        </li>
        <li>
          <strong>Deploy MCP</strong> — Run <code className="inline">mcp-server</code> with your project
          keys (see repo docs).
        </li>
        <li>
          <strong>Connect</strong> — Follow the{' '}
          <Link href="/connect">setup guide</Link>, then create a token in the dashboard and paste the MCP URL
          + Bearer secret into your AI app&apos;s connector settings.
        </li>
        <li>
          <strong>Memory files</strong> — After tools run, open <strong>Memory files</strong> to see
          markdown in Storage.
        </li>
      </ol>

      <hr className="divider" />

      <h2 className="section-title">Developer tools</h2>
      <p className="muted small">
        SQL hash helper and health proxy (no login required).{' '}
        <Link href="/dev/setup">Token SQL</Link>
        {' · '}
        <Link href="/dev/check">Health check</Link>
      </p>

      <p className="muted small" style={{ marginTop: '1.5rem' }}>
        Docs: <code className="inline">docs/DEPLOY_MILESTONE_A.md</code>,{' '}
        <code className="inline">docs/MCP_CLIENT_CONNECTION.md</code>
      </p>
    </main>
  );
}

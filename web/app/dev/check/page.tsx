import Link from 'next/link';
import { HealthCheckForm } from '@/components/HealthCheckForm';

export default function DevCheckPage() {
  return (
    <main className="page">
      <nav className="crumb">
        <Link href="/">← Home</Link>
      </nav>
      <h1>MCP server health</h1>
      <p className="lede">
        Use this <strong>after</strong> the MCP server is running (local <code className="inline">npm run dev</code>{' '}
        or Railway). Paste the <strong>base URL only</strong> (no <code className="inline">/mcp</code>
        suffix); we call <code className="inline">/health</code> on it.
      </p>
      <HealthCheckForm />
    </main>
  );
}

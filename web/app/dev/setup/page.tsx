import Link from 'next/link';
import { SetupTokenForm } from '@/components/SetupTokenForm';

export default function DevSetupPage() {
  return (
    <main className="page">
      <nav className="crumb">
        <Link href="/">← Home</Link>
      </nav>
      <p className="muted small">
        Developer tool — prefer <Link href="/dashboard/connect">Dashboard → Connect AI</Link> when signed
        in.
      </p>
      <h1>MCP token (Path B) — SQL helper</h1>
      <p className="lede">
        This page does <strong>not</strong> create a database row for you. It matches{' '}
        <code className="inline">npm run hash-token</code> and prints SQL you run in the{' '}
        <strong>Supabase SQL Editor</strong>.
      </p>
      <ol className="steps">
        <li>Copy your <strong>User UUID</strong> from Supabase → Authentication → Users.</li>
        <li>
          Invent a long random <strong>plain secret</strong> (password manager). You will paste the{' '}
          <em>same</em> string into ChatGPT (or another client) as the Bearer token—not the hash.
        </li>
        <li>Fill the form below → copy the SQL → run it in Supabase.</li>
        <li>
          In the AI app: connector URL <code className="inline">https://your-server/mcp</code>, Bearer =
          that plain secret.
        </li>
      </ol>
      <SetupTokenForm />
    </main>
  );
}

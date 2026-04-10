import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { SupabaseEnvNotice } from '@/components/SupabaseEnvNotice';

export default function LoginPage() {
  return (
    <main className="page auth-page">
      <h1>Sign in</h1>
      <p className="lede muted">Access your Memforme dashboard and MCP connections.</p>
      <SupabaseEnvNotice />
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
      <p className="muted small">
        <Link href="/">← Back to home</Link>
      </p>
    </main>
  );
}

import Link from 'next/link';
import { Suspense } from 'react';
import { SignupForm } from '@/components/SignupForm';
import { SupabaseEnvNotice } from '@/components/SupabaseEnvNotice';

export default function SignupPage() {
  return (
    <main className="page auth-page">
      <h1>Create account</h1>
      <p className="lede muted">Uses Supabase Auth — same user id as your memory and MCP tokens.</p>
      <SupabaseEnvNotice />
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <SignupForm />
      </Suspense>
      <p className="muted small">
        <Link href="/">← Back to home</Link>
      </p>
    </main>
  );
}

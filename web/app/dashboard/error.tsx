'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard]', error);
  }, [error]);

  const msg = error.message || 'Something went wrong loading this page.';
  const isEnv = msg.includes('NEXT_PUBLIC_SUPABASE');

  return (
    <main className="page" style={{ maxWidth: '36rem' }}>
      <h1>Couldn&apos;t load the dashboard</h1>
      <p className="form-error">{msg}</p>
      {isEnv ? (
        <p className="muted small">
          Create or fix <code className="inline">web/.env.local</code> using <code className="inline">web/.env.example</code>, then
          fully stop and restart the dev server so Next.js picks up env vars.
        </p>
      ) : null}
      <div className="row" style={{ marginTop: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button type="button" className="btn primary" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/login" className="btn">
          Back to sign in
        </Link>
        <Link href="/" className="btn">
          Home
        </Link>
      </div>
    </main>
  );
}

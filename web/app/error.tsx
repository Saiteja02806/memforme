'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app]', error);
  }, [error]);

  const msg = error.message || 'Something went wrong.';
  const isEnv = msg.includes('NEXT_PUBLIC_SUPABASE');

  return (
    <main className="page" style={{ maxWidth: '36rem' }}>
      <h1>Something went wrong</h1>
      <p className="form-error">{msg}</p>
      {isEnv ? (
        <p className="muted small">
          Fix <code className="inline">web/.env.local</code> (see <code className="inline">web/.env.example</code>) and
          restart <code className="inline">npm run web:dev</code>.
        </p>
      ) : null}
      <div className="row" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn primary" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/" className="btn">
          Home
        </Link>
      </div>
    </main>
  );
}

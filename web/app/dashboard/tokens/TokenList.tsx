'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase-browser';

export type TokenRow = {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
};

export function TokenList({ initial }: { initial: TokenRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const revoke = async (id: string) => {
    setError('');
    setBusyId(id);
    try {
      const supabase = createBrowserSupabase();
      const { error: uErr } = await supabase.from('mcp_tokens').update({ revoked: true }).eq('id', id);
      if (uErr) {
        setError(uErr.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, revoked: true } : r)));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <p className="muted">
        No tokens yet.{' '}
        <Link href="/dashboard/connect">Create one on the Connect page</Link>.
      </p>
    );
  }

  return (
    <div className="stack">
      {error ? <p className="form-error">{error}</p> : null}
      <ul className="token-table">
        {rows.map((r) => (
          <li key={r.id} className="panel token-row">
            <div>
              <strong>{r.label ?? '(no label)'}</strong>
              <span className={`badge ${r.revoked ? 'badge-off' : 'badge-on'}`}>
                {r.revoked ? 'Revoked' : 'Active'}
              </span>
            </div>
            <p className="muted small" style={{ margin: '0.35rem 0' }}>
              Created {new Date(r.created_at).toLocaleString()}
              {r.last_used_at ? ` · Last used ${new Date(r.last_used_at).toLocaleString()}` : ''}
            </p>
            {!r.revoked ? (
              <button
                type="button"
                className="btn small danger"
                disabled={busyId === r.id}
                onClick={() => void revoke(r.id)}
              >
                {busyId === r.id ? '…' : 'Revoke'}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

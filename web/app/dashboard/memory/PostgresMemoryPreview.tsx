'use client';

import { useCallback, useEffect, useState } from 'react';

type Item = {
  id: string;
  type: string;
  created_at: string;
  text: string | null;
  decrypt_error?: string;
};

export function PostgresMemoryPreview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/memory-preview?limit=40', { credentials: 'same-origin' });
      const data = (await res.json()) as { memories?: Item[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setItems([]);
        return;
      }
      setItems(data.memories ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="muted">Loading decrypted memories…</p>;
  }

  if (error) {
    return (
      <div className="stack">
        <p className="form-error">{error}</p>
        <button type="button" className="btn small" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="muted">
        No active memory rows in Postgres yet. Use <code className="inline">write_memory</code> from an
        MCP client to create encrypted entries.
      </p>
    );
  }

  return (
    <div className="stack">
      <button type="button" className="btn small" onClick={() => void load()}>
        Refresh
      </button>
      <ul className="memory-file-list">
        {items.map((m) => (
          <li key={m.id} className="panel rounded-lg border border-slate-200 shadow-sm">
            <p className="muted small" style={{ marginTop: 0 }}>
              <strong>{m.type}</strong> · {new Date(m.created_at).toLocaleString()}
            </p>
            {m.decrypt_error ? (
              <p className="form-error">{m.decrypt_error}</p>
            ) : (
              <pre className="mono memory-preview">{m.text}</pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

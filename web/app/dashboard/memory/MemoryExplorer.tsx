'use client';

import { useCallback, useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase-browser';

const BUCKET = 'user-memory';

type FileRow = { name: string };

export function MemoryExplorer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});
  const [loadBusy, setLoadBusy] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Not signed in.');
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data, error: listErr } = await supabase.storage.from(BUCKET).list(user.id, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (listErr) {
        setError(listErr.message);
        setLoading(false);
        return;
      }
      const md = (data ?? []).filter(
        (f) => f.name && !f.name.endsWith('/') && f.name.endsWith('.md')
      );
      setFiles(md.map((f) => ({ name: f.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const toggleFile = async (name: string) => {
    if (open === name) {
      setOpen(null);
      return;
    }
    setOpen(name);
    if (content[name] !== undefined || !userId) {
      return;
    }
    setLoadBusy(name);
    setError('');
    try {
      const supabase = createBrowserSupabase();
      const path = `${userId}/${name}`;
      const { data, error: dErr } = await supabase.storage.from(BUCKET).download(path);
      if (dErr) {
        setError(dErr.message);
        return;
      }
      const text = await data.text();
      setContent((c) => ({ ...c, [name]: text }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadBusy(null);
    }
  };

  if (loading) {
    return <p className="muted">Loading…</p>;
  }

  if (error && !userId) {
    return <p className="form-error">{error}</p>;
  }

  if (files.length === 0) {
    return (
      <div className="stack">
        {error ? <p className="form-error">{error}</p> : null}
        <p className="muted">
          No markdown files in Storage yet. Use your MCP connector in ChatGPT (or another client) to{' '}
          <strong>write_memory</strong> — the server syncs per-type <code className="inline">.md</code>{' '}
          files into this bucket under your user id.
        </p>
        <button type="button" className="btn small" onClick={() => void loadList()}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      {error ? <p className="form-error">{error}</p> : null}
      <p className="muted small">
        Files in <code className="inline">{BUCKET}/{'{your-id}'}/</code> (read-only in this view).
      </p>
      <button type="button" className="btn small" onClick={() => void loadList()}>
        Refresh list
      </button>
      <ul className="memory-file-list">
        {files.map((f) => (
          <li key={f.name} className="panel">
            <button type="button" className="memory-file-toggle" onClick={() => void toggleFile(f.name)}>
              {open === f.name ? '▼' : '▶'} {f.name}
              {loadBusy === f.name ? ' …' : ''}
            </button>
            {open === f.name && content[f.name] !== undefined ? (
              <pre className="mono memory-preview">{content[f.name]}</pre>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

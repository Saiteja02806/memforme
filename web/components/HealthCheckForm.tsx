'use client';

import { useState } from 'react';

type HealthResult = {
  ok?: boolean;
  status?: number;
  healthUrl?: string;
  body?: unknown;
  error?: string;
};

export function HealthCheckForm() {
  const [baseUrl, setBaseUrl] = useState('');
  const [result, setResult] = useState<HealthResult | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = baseUrl.trim();
    if (!u) {
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch('/api/mcp-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: u }),
      });
      const j = (await r.json()) as HealthResult;
      setResult(j);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <p className="muted">
        Server-side check (avoids browser CORS). Allowed hosts:{' '}
        <code className="inline">*.up.railway.app</code> and{' '}
        <code className="inline">localhost</code>. For other domains, open{' '}
        <code className="inline">/health</code> in a new tab or use curl.
      </p>
      <form className="stack" onSubmit={(e) => void onSubmit(e)}>
        <label className="field">
          <span>MCP server base URL</span>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://your-service.up.railway.app"
          />
        </label>
        <button type="submit" className="btn primary" disabled={busy || !baseUrl.trim()}>
          {busy ? 'Checking…' : 'GET /health'}
        </button>
      </form>
      {result ? (
        <div className="panel">
          <pre className="mono wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}

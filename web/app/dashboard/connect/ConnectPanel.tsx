'use client';

import { useCallback, useState } from 'react';
import { friendlySupabaseError } from '@/lib/auth-errors';

function mcpUrlFromEnv(): string {
  const base = process.env.NEXT_PUBLIC_MCP_SERVER_URL?.trim().replace(/\/+$/, '') ?? '';
  return base ? `${base}/mcp` : '';
}

export function ConnectPanel() {
  const mcpUrl = mcpUrlFromEnv();
  const [label, setLabel] = useState('ChatGPT');
  const [plainSecret, setPlainSecret] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const createToken = useCallback(async () => {
    setError('');
    setBusy(true);
    setPlainSecret(null);
    setDismissed(false);
    try {
      const res = await fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ label: label.trim() || 'connection' }),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok) {
        setError(friendlySupabaseError(data.error ?? `HTTP ${res.status}`));
        return;
      }
      if (!data.token) {
        setError('Invalid response from server.');
        return;
      }
      setPlainSecret(data.token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(friendlySupabaseError(msg));
    } finally {
      setBusy(false);
    }
  }, [label]);

  const onDismiss = () => {
    setDismissed(true);
    setPlainSecret(null);
  };

  return (
    <div className="stack">
      <p className="muted">
        This registers a token for <strong>your</strong> account. Copy the secret once — it is not
        stored in the database (only a hash is). Use it as the Bearer value in your AI app&apos;s MCP
        connector.
      </p>
      <p className="muted small">
        <strong>Same user everywhere:</strong> memories from <code className="inline">write_memory</code> go to the
        Supabase user tied to <em>this</em> Bearer. If you instead use <code className="inline">MCP_BEARER_TOKEN</code>{' '}
        in <code className="inline">mcp-server/.env</code>, those writes use{' '}
        <code className="inline">SUPABASE_FALLBACK_USER_ID</code> — a different account than your dashboard login.
      </p>

      {!mcpUrl ? (
        <p className="form-error">
          Set <code className="inline">NEXT_PUBLIC_MCP_SERVER_URL</code> in{' '}
          <code className="inline">.env.local</code> (e.g. your Railway URL without a trailing slash) so
          we can show the exact connector URL.
        </p>
      ) : (
        <div className="panel">
          <p className="muted" style={{ marginTop: 0 }}>
            <strong>Connector URL</strong> (paste into ChatGPT / compatible clients)
          </p>
          <pre className="mono wrap">{mcpUrl}</pre>
          <button type="button" className="btn small" onClick={() => void copy(mcpUrl)}>
            Copy URL
          </button>
        </div>
      )}

      <label className="field">
        <span>Label (for your reference)</span>
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>

      <button type="button" className="btn primary" disabled={busy} onClick={() => void createToken()}>
        {busy ? 'Creating…' : 'Generate token & save'}
      </button>

      {error ? <p className="form-error">{error}</p> : null}

      {plainSecret && !dismissed ? (
        <div className="panel secret-once">
          <p className="form-error" style={{ marginTop: 0 }}>
            Copy this secret now. You will not be able to see it again.
          </p>
          <pre className="mono wrap">{plainSecret}</pre>
          <div className="row" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="btn small" onClick={() => void copy(plainSecret)}>
              Copy Bearer secret
            </button>
            <button type="button" className="btn" onClick={onDismiss}>
              I saved it — hide
            </button>
          </div>
        </div>
      ) : null}

      <div className="callout">
        <strong>ChatGPT:</strong> In your GPT or connector settings, set the MCP URL and API key /
        Bearer to the values above. See <code className="inline">docs/MCP_CLIENT_CONNECTION.md</code>{' '}
        in the repository for CORS, Path B, and troubleshooting.
      </div>
    </div>
  );
}

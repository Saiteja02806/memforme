'use client';

import { useCallback, useState } from 'react';
import { sha256HexUtf8 } from '@/lib/mcpTokenHash';

export function SetupTokenForm() {
  const [secret, setSecret] = useState('');
  const [userId, setUserId] = useState('');
  const [label, setLabel] = useState('chatgpt');
  const [hash, setHash] = useState('');
  const [busy, setBusy] = useState(false);

  const buildSql = useCallback(
    (hex: string) => {
      const uid = userId.trim() || 'YOUR_USER_UUID';
      const esc = label.replace(/'/g, "''");
      return `-- Run in Supabase SQL Editor (replace ${uid === 'YOUR_USER_UUID' ? 'YOUR_USER_UUID' : 'uuid'} if needed)
insert into public.mcp_tokens (user_id, token_hash, label, scopes)
values (
  '${uid}'::uuid,
  '${hex}',
  '${esc}',
  array['read','suggest_write']::text[]
)
on conflict (token_hash) do nothing;`;
    },
    [userId, label]
  );

  const onHash = async () => {
    const s = secret.trim();
    if (!s) {
      return;
    }
    setBusy(true);
    try {
      const hex = await sha256HexUtf8(s);
      setHash(hex);
    } finally {
      setBusy(false);
    }
  };

  const sql = hash ? buildSql(hash) : '';

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="stack">
      <p className="muted">
        The MCP server stores <strong>SHA-256 (hex)</strong> of your Bearer secret — same algorithm
        as <code className="inline">npm run hash-token -- &quot;…&quot;</code> from the repo root.
        Use the <strong>same plain secret</strong> in ChatGPT&apos;s connector.
      </p>

      <label className="field">
        <span>Plain MCP secret (Bearer value)</span>
        <input
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(e) => {
            setSecret(e.target.value);
            setHash('');
          }}
          placeholder="Long random string from a password manager"
        />
      </label>

      <label className="field">
        <span>Your Supabase Auth user id (UUID)</span>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="From Supabase → Authentication → Users"
        />
      </label>

      <label className="field">
        <span>Label (optional)</span>
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>

      <button type="button" className="btn primary" disabled={busy || !secret.trim()} onClick={() => void onHash()}>
        {busy ? 'Hashing…' : 'Generate hash & SQL'}
      </button>

      {hash ? (
        <div className="stack">
          <div className="panel">
            <div className="row">
              <strong>token_hash (hex)</strong>
              <button type="button" className="btn small" onClick={() => void copy(hash)}>
                Copy
              </button>
            </div>
            <pre className="mono wrap">{hash}</pre>
          </div>
          <div className="panel">
            <div className="row">
              <strong>SQL</strong>
              <button type="button" className="btn small" onClick={() => void copy(sql)}>
                Copy SQL
              </button>
            </div>
            <pre className="mono wrap">{sql}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Local MCP smoke test: /health, initialize, tools/list.
 * Run from repo root: `npm run smoke` or from mcp-server: `npm run smoke`.
 * Loads mcp-server/.env regardless of cwd.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(pkgRoot, '.env') });

/** Give fetch/undici time to close handles before exit (reduces Windows libuv UV_HANDLE_CLOSING crashes). */
async function exit(code) {
  await new Promise((r) => setTimeout(r, 100));
  process.exit(code);
}

/** Same normalization as server `normalizeEnvBearerSecret` (trim + strip outer quotes). */
function normalizeEnvBearer(raw) {
  if (raw == null || raw === '') return '';
  return raw.trim().replace(/^["']|["']$/g, '').trim();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const rawToken = normalizeEnvBearer(process.env.MCP_BEARER_TOKEN);
const rawFallback = normalizeEnvBearer(process.env.SUPABASE_FALLBACK_USER_ID);
if (rawToken && rawFallback && !UUID_RE.test(rawFallback)) {
  console.warn(
    '[smoke] SUPABASE_FALLBACK_USER_ID is not a valid UUID — server disables dev fallback; fix .env or use public.mcp_tokens.'
  );
}

/**
 * If SMOKE_BASE_URL is unset, scan 127.0.0.1:PORT..PORT+14 /health (same range as the server).
 */
async function resolveBaseUrl() {
  const explicitRaw = process.env.SMOKE_BASE_URL?.trim();
  const explicit = explicitRaw?.replace(/\/$/, '') ?? '';
  if (explicit) {
    console.log('[smoke] Using SMOKE_BASE_URL=', explicit);
    return explicit;
  }
  const startPort = Number(process.env.PORT) || 3000;
  const host = '127.0.0.1';
  for (let i = 0; i < 15; i++) {
    const port = startPort + i;
    const url = `http://${host}:${port}`;
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(600) });
      if (!res.ok) continue;
      const text = await res.text();
      if (!/"ok"\s*:\s*true/.test(text)) continue;
      if (i > 0) {
        console.log(
          `[smoke] Discovered server at ${url} (wanted PORT ${startPort}; set SMOKE_BASE_URL to skip scan)`
        );
      } else {
        console.log(`[smoke] Using ${url}`);
      }
      return url;
    } catch {
      /* try next port */
    }
  }
  console.error(
    `[smoke] No server on ${host}:${startPort}–${startPort + 14} (/health). Start the app (npm run dev), or set SMOKE_BASE_URL.`
  );
  return null;
}

async function main() {
  if (!rawToken) {
    console.error('Set MCP_BEARER_TOKEN in mcp-server/.env (or env) for smoke test.');
    await exit(1);
    return;
  }

  const base = await resolveBaseUrl();
  if (!base) {
    await exit(1);
    return;
  }

  let healthRes;
  let healthText;
  try {
    healthRes = await fetch(`${base}/health`);
    healthText = await healthRes.text();
  } catch (e) {
    const msg = e?.cause?.code === 'ECONNREFUSED' || e?.code === 'ECONNREFUSED'
      ? `Nothing listening at ${base} — start the server (npm run dev) or fix SMOKE_BASE_URL.`
      : String(e?.message || e);
    console.error('[health] fetch failed:', msg);
    await exit(1);
    return;
  }
  console.log('[health]', healthRes.status, healthText);
  if (!healthRes.ok) {
    await exit(1);
    return;
  }

  const initBody = {
    jsonrpc: '2.0',
    method: 'initialize',
    id: 1,
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'smoke-test', version: '1.0.0' },
    },
  };

  const initRes = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${rawToken}`,
    },
    body: JSON.stringify(initBody),
  });

  const initCt = initRes.headers.get('content-type') ?? '';
  const initText = await initRes.text();
  console.log('[initialize]', initRes.status, initCt);
  const sid =
    initRes.headers.get('mcp-session-id') ||
    initRes.headers.get('Mcp-Session-Id');
  console.log('[mcp-session-id]', sid ?? '(missing)');

  if (!initRes.ok) {
    console.log(initText.slice(0, 600));
    if (initRes.status === 401) {
      console.error(
        '\n401: Token not accepted. Either:\n' +
          '  • Insert a row in public.mcp_tokens with SHA-256 hex of your Bearer secret, or\n' +
          '  • Dev: set both MCP_BEARER_TOKEN and SUPABASE_FALLBACK_USER_ID in mcp-server/.env (must match server; token must match byte-for-byte).\n' +
          'Smoke auto-scans PORT..PORT+14 for /health; override with SMOKE_BASE_URL if needed.'
      );
    }
    await exit(1);
    return;
  }

  if (!sid) {
    console.log(initText.slice(0, 800));
    console.error('No session id — cannot call tools/list.');
    await exit(1);
    return;
  }

  const listBody = {
    jsonrpc: '2.0',
    method: 'tools/list',
    id: 2,
  };

  const listRes = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'mcp-session-id': sid,
      Authorization: `Bearer ${rawToken}`,
    },
    body: JSON.stringify(listBody),
  });

  const listText = await listRes.text();
  console.log('[tools/list]', listRes.status, listText.slice(0, 1200));

  if (!listRes.ok) {
    await exit(1);
    return;
  }

  console.log('\nSmoke test finished OK.');
}

main().catch(async (e) => {
  console.error(e);
  await exit(1);
});

#!/usr/bin/env node
/**
 * Simulates the browser / ChatGPT-style MCP sequence beyond basic smoke:
 *   health → (optional CORS preflight) → initialize → tools/list → tools/call write_memory → tools/call query_memory
 *
 * Matches MCP Inspector / ChatGPT headers where relevant (Accept, session id, optional Origin).
 *
 * Usage (from repo root or mcp-server):
 *   npm run inspector-flow --prefix mcp-server
 *   npm run inspector-flow --prefix mcp-server -- --chatgpt-origin
 *
 * Env (mcp-server/.env):
 *   Bearer secret (any one):
 *     - MCP_BEARER_TOKEN (same as smoke-test; dev fallback), or
 *     - INSPECTOR_BEARER_TOKEN / MCP_SMOKE_BEARER — plain secret that matches a public.mcp_tokens row (Path B)
 *   SMOKE_BASE_URL optional; else scans PORT..PORT+14 for /health
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(pkgRoot, '.env') });

async function exit(code) {
  await new Promise((r) => setTimeout(r, 100));
  process.exit(code);
}

function normalizeEnvBearer(raw) {
  if (raw == null || raw === '') return '';
  return raw.trim().replace(/^["']|["']$/g, '').trim();
}

/** Pull last JSON-RPC object from plain JSON or SSE `data:` lines. */
function parseLastJsonRpc(text) {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      return JSON.parse(t);
    } catch {
      /* fall through */
    }
  }
  let last = null;
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s.startsWith('data:')) continue;
    const payload = s.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      last = JSON.parse(payload);
    } catch {
      /* ignore */
    }
  }
  return last;
}

function toolNamesFromListResult(parsed) {
  const tools = parsed?.result?.tools;
  if (!Array.isArray(tools)) return [];
  return tools.map((t) => t.name).filter(Boolean);
}

async function resolveBaseUrl() {
  const explicit = process.env.SMOKE_BASE_URL?.trim().replace(/\/$/, '') ?? '';
  if (explicit) {
    console.log('[inspector-flow] SMOKE_BASE_URL=', explicit);
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
      console.log('[inspector-flow] Using', url);
      return url;
    } catch {
      /* next */
    }
  }
  console.error(
    `[inspector-flow] No server on ${host}:${startPort}–${startPort + 14}. Start npm run dev or set SMOKE_BASE_URL.`
  );
  return null;
}

function baseHeaders(token, sessionId, extra = {}) {
  const h = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${token}`,
    ...extra,
  };
  if (sessionId) {
    h['mcp-session-id'] = sessionId;
  }
  return h;
}

async function main() {
  const useChatgptOrigin = process.argv.includes('--chatgpt-origin');
  const rawToken = normalizeEnvBearer(
    process.env.MCP_BEARER_TOKEN ||
      process.env.INSPECTOR_BEARER_TOKEN ||
      process.env.MCP_SMOKE_BEARER
  );
  if (!rawToken) {
    console.error(
      '[inspector-flow] Set a Bearer secret in mcp-server/.env:\n' +
        '  • MCP_BEARER_TOKEN — dev (matches MCP_DISABLE_ENV_FALLBACK off + fallback user), or\n' +
        '  • INSPECTOR_BEARER_TOKEN (or MCP_SMOKE_BEARER) — plain secret registered in public.mcp_tokens (Path B / ChatGPT).\n' +
        'Same value you paste into ChatGPT or MCP Inspector.'
    );
    await exit(1);
    return;
  }

  const base = await resolveBaseUrl();
  if (!base) {
    await exit(1);
    return;
  }

  const originHeaders = useChatgptOrigin ? { Origin: 'https://chatgpt.com' } : {};

  const gaps = [];
  const ok = [];

  console.log('\n=== 1) GET /health ===');
  const healthRes = await fetch(`${base}/health`, { headers: originHeaders });
  const healthText = await healthRes.text();
  console.log('status', healthRes.status, healthText.slice(0, 200));
  if (healthRes.ok) ok.push('health');
  else gaps.push('health not OK');

  if (useChatgptOrigin) {
    console.log('\n=== 2) OPTIONS /mcp (CORS preflight like browser) ===');
    try {
      const optRes = await fetch(`${base}/mcp`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://chatgpt.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type, authorization, mcp-session-id, accept',
        },
      });
      console.log('OPTIONS status', optRes.status);
      const acao = optRes.headers.get('access-control-allow-origin');
      console.log('access-control-allow-origin:', acao ?? '(missing)');
      if (optRes.status >= 200 && optRes.status < 400 && acao) {
        ok.push('cors_preflight');
      } else {
        gaps.push(
          'CORS preflight may fail in real ChatGPT if allow-origin missing — set MCP_EXTRA_CORS_ORIGINS or rely on default chatgpt.com in corsConfig'
        );
      }
    } catch (e) {
      gaps.push(`OPTIONS failed: ${e.message}`);
    }
  } else {
    console.log('\n=== 2) OPTIONS skipped (pass --chatgpt-origin to simulate browser CORS) ===');
  }

  console.log('\n=== 3) initialize (Streamable HTTP) ===');
  const initBody = {
    jsonrpc: '2.0',
    method: 'initialize',
    id: 1,
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'inspector-flow-sim', version: '1.0.0' },
    },
  };

  const initRes = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: baseHeaders(rawToken, null, originHeaders),
    body: JSON.stringify(initBody),
  });
  const initText = await initRes.text();
  const sid =
    initRes.headers.get('mcp-session-id') || initRes.headers.get('Mcp-Session-Id');
  console.log('status', initRes.status, initRes.headers.get('content-type'));
  console.log('mcp-session-id', sid ?? '(missing)');
  const initParsed = parseLastJsonRpc(initText);
  if (initParsed?.error) {
    console.log('jsonrpc error', initParsed.error);
  }
  if (!initRes.ok || !sid) {
    console.log(initText.slice(0, 800));
    gaps.push('initialize failed — ChatGPT/Inspector cannot proceed');
    console.log('\n--- Gap summary ---');
    gaps.forEach((g) => console.log('  -', g));
    await exit(1);
    return;
  }
  ok.push('initialize + session');

  console.log('\n=== 4) tools/list ===');
  const listRes = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: baseHeaders(rawToken, sid, originHeaders),
    body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 2 }),
  });
  const listText = await listRes.text();
  const listParsed = parseLastJsonRpc(listText);
  const names = toolNamesFromListResult(listParsed);
  console.log('status', listRes.status, 'tools:', names.join(', ') || '(none parsed)');
  if (!listRes.ok) {
    gaps.push('tools/list failed');
    console.log(listText.slice(0, 600));
    await exit(1);
    return;
  }
  ok.push('tools/list');
  const expected = ['query_memory', 'write_memory', 'update_memory', 'delete_memory'];
  for (const n of expected) {
    if (!names.includes(n)) {
      gaps.push(`tool missing from list: ${n} (expected for full ChatGPT parity)`);
    }
  }

  console.log('\n=== 5) tools/call write_memory (Inspector-style) ===');
  const writeBody = {
    jsonrpc: '2.0',
    method: 'tools/call',
    id: 3,
    params: {
      name: 'write_memory',
      arguments: {
        type: 'stack',
        content: `Inspector-flow smoke ${new Date().toISOString()}`,
        source: 'inspector-flow',
        confidence: 0.9,
      },
    },
  };
  const writeRes = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: baseHeaders(rawToken, sid, originHeaders),
    body: JSON.stringify(writeBody),
  });
  const writeText = await writeRes.text();
  const writeParsed = parseLastJsonRpc(writeText);
  console.log('status', writeRes.status);
  if (writeParsed?.error) {
    console.log('error', writeParsed.error);
  }
  if (writeParsed?.result) {
    console.log('result preview', JSON.stringify(writeParsed.result).slice(0, 400));
  }
  if (!writeRes.ok || writeParsed?.error) {
    gaps.push('write_memory failed — ChatGPT could not persist memory');
  } else {
    ok.push('write_memory');
  }

  console.log('\n=== 6) tools/call query_memory ===');
  const queryBody = {
    jsonrpc: '2.0',
    method: 'tools/call',
    id: 4,
    params: {
      name: 'query_memory',
      arguments: { limit: 5 },
    },
  };
  const queryRes = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: baseHeaders(rawToken, sid, originHeaders),
    body: JSON.stringify(queryBody),
  });
  const queryText = await queryRes.text();
  const queryParsed = parseLastJsonRpc(queryText);
  console.log('status', queryRes.status);
  if (queryParsed?.error) {
    console.log('error', queryParsed.error);
  }
  if (queryParsed?.result) {
    console.log('result preview', JSON.stringify(queryParsed.result).slice(0, 500));
  }
  if (!queryRes.ok || queryParsed?.error) {
    gaps.push('query_memory failed — ChatGPT could not read memory');
  } else {
    ok.push('query_memory');
  }

  console.log('\n========== Inspector / ChatGPT flow report ==========');
  console.log('OK:', ok.join(', ') || '(none)');
  if (gaps.length) {
    console.log('Gaps / risks:', gaps.length);
    gaps.forEach((g) => console.log('  •', g));
  } else {
    console.log('Gaps: none detected by this script (DB decrypt/env still apply in production).');
  }
  console.log(
    '\nNote: Official @modelcontextprotocol/inspector UI may send notifications/initialized; this server accepts tools/list right after initialize (same as smoke-test).'
  );
  console.log(
    'For the real Inspector UI, run: npx @modelcontextprotocol/inspector  then connect to',
    `${base}/mcp`,
    'with your Bearer token.'
  );

  const exitCode =
    !ok.includes('write_memory') || !ok.includes('query_memory') || !ok.includes('tools/list')
      ? 1
      : 0;
  await exit(exitCode);
}

main().catch(async (e) => {
  console.error(e);
  await exit(1);
});

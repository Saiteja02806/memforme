import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { oauthAuthorizationServerIssuer } from './auth/oauthResource.js';

const UNCONFIGURED = {
  error: 'oauth_issuer_unconfigured',
  error_description:
    'Set OAUTH_ISSUER_URL to your Next.js app origin (authorization server). MCP proxies OAuth discovery and token traffic to that host.',
};

function issuerBase(): string | null {
  return oauthAuthorizationServerIssuer();
}

function singleHeader(v: string | string[] | undefined): string | undefined {
  if (v == null) {
    return undefined;
  }
  return Array.isArray(v) ? v[0] : v;
}

/** Rebuild application/x-www-form-urlencoded body for upstream token request. */
function tokenRequestBody(request: FastifyRequest): string {
  const b = request.body;
  if (b == null) {
    return '';
  }
  if (typeof b === 'string') {
    return b;
  }
  if (typeof b === 'object' && !Buffer.isBuffer(b)) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(b as Record<string, unknown>)) {
      if (v == null) {
        continue;
      }
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        sp.set(k, String(v));
      }
    }
    return sp.toString();
  }
  return String(b);
}

async function sendProxyError(
  reply: FastifyReply,
  app: FastifyInstance,
  err: unknown,
  label: string
): Promise<FastifyReply> {
  app.log.error({ err }, label);
  return reply.code(502).send({
    error: 'oauth_proxy_failed',
    error_description:
      'Could not reach authorization server (check OAUTH_ISSUER_URL and web deployment)',
  });
}

/**
 * Some MCP hosts (e.g. ChatGPT) probe OAuth URLs on the **same origin** as `/mcp`.
 * Real authorization server lives on Next.js (`OAUTH_ISSUER_URL`); we mirror discovery + proxy token/register/userinfo.
 */
export async function registerOAuthIssuerBridge(app: FastifyInstance): Promise<void> {
  app.get('/.well-known/oauth-authorization-server', async (_request, reply) => {
    const base = issuerBase();
    if (!base) {
      return reply.code(503).send(UNCONFIGURED);
    }
    try {
      const url = `${base}/.well-known/oauth-authorization-server`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      const text = await res.text();
      const ct =
        res.headers.get('content-type') ?? 'application/json; charset=utf-8';
      return reply.code(res.status).header('Content-Type', ct).send(text);
    } catch (e) {
      return await sendProxyError(
        reply,
        app,
        e,
        'oauth-authorization-server proxy failed'
      );
    }
  });

  app.get('/oauth/authorize', async (request, reply) => {
    const base = issuerBase();
    if (!base) {
      return reply.code(503).send(UNCONFIGURED);
    }
    const full = request.url;
    const q = full.includes('?') ? full.slice(full.indexOf('?')) : '';
    return reply.redirect(`${base}/oauth/authorize${q}`);
  });

  app.post('/oauth/token', async (request, reply) => {
    const base = issuerBase();
    if (!base) {
      return reply.code(503).send(UNCONFIGURED);
    }
    const body = tokenRequestBody(request);
    const ct =
      singleHeader(request.headers['content-type']) ??
      'application/x-www-form-urlencoded';
    try {
      const res = await fetch(`${base}/oauth/token`, {
        method: 'POST',
        headers: { 'content-type': ct },
        body,
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();
      const rct =
        res.headers.get('content-type') ?? 'application/json; charset=utf-8';
      return reply.code(res.status).header('Content-Type', rct).send(text);
    } catch (e) {
      return await sendProxyError(reply, app, e, 'oauth/token proxy failed');
    }
  });

  app.options('/oauth/token', async (_request, reply) => {
    return reply
      .code(204)
      .header('Access-Control-Allow-Origin', '*')
      .header('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      )
      .send();
  });

  app.post('/oauth/register', async (request, reply) => {
    const base = issuerBase();
    if (!base) {
      return reply.code(503).send(UNCONFIGURED);
    }
    const body = JSON.stringify(request.body ?? {});
    try {
      const res = await fetch(`${base}/oauth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      const rct =
        res.headers.get('content-type') ?? 'application/json; charset=utf-8';
      return reply.code(res.status).header('Content-Type', rct).send(text);
    } catch (e) {
      return await sendProxyError(reply, app, e, 'oauth/register proxy failed');
    }
  });

  app.options('/oauth/register', async (_request, reply) => {
    return reply
      .code(204)
      .header('Access-Control-Allow-Origin', '*')
      .header('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      )
      .send();
  });

  app.get('/oauth/userinfo', async (request, reply) => {
    const base = issuerBase();
    if (!base) {
      return reply.code(503).send(UNCONFIGURED);
    }
    const auth = singleHeader(request.headers.authorization);
    try {
      const res = await fetch(`${base}/oauth/userinfo`, {
        headers: auth ? { authorization: auth } : {},
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      const rct =
        res.headers.get('content-type') ?? 'application/json; charset=utf-8';
      return reply.code(res.status).header('Content-Type', rct).send(text);
    } catch (e) {
      return await sendProxyError(reply, app, e, 'oauth/userinfo proxy failed');
    }
  });
}

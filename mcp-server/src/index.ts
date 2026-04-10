import { loadMcpEnv } from './loadEnv.js';
loadMcpEnv();

import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import rateLimit from '@fastify/rate-limit';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { getMcpAuthStartupLines } from './auth/mcpAuthConfig.js';
import {
  mcpPublicBaseUrl,
  wwwAuthenticateUnauthorized,
} from './auth/oauthResource.js';
import { resolveMcpAuth, type McpAuthResolveOptions } from './auth/resolveMcpUser.js';
import { createCorsAllowlist, isRelaxLocalCorsEnabled } from './corsConfig.js';
import { createMemoryMcpServer } from './createMcpServer.js';
import { startMarkdownResyncWorker } from './queue/markdownWorker.js';
import { registerOAuthRoutes } from './oauth/index.js';
import { getSupabaseServiceClient } from './supabase/client.js';

const PORT = Number(process.env.PORT) || 3000;

const supabase = getSupabaseServiceClient();

const { allowedOrigin, explicitOrigins } = createCorsAllowlist();

const transports: Record<string, StreamableHTTPServerTransport> = {};
/** user_id that opened the session — must match Bearer on every follow-up request */
const sessionUserId: Record<string, string> = {};

const app = Fastify({
  logger: true,
  trustProxy: true,
  bodyLimit: Number(process.env.MCP_BODY_LIMIT_BYTES) || 512 * 1024,
});

const authResolveOpts: McpAuthResolveOptions = {
  onDbLookupError: (message, code) => {
    app.log.warn({ message, code }, 'mcp_tokens lookup failed (client still receives 401)');
  },
};

await app.register(rateLimit, {
  global: true,
  max: Number(process.env.MCP_RATE_LIMIT_MAX) || 400,
  timeWindow: process.env.MCP_RATE_LIMIT_WINDOW || '1 minute',
  allowList: (request) => {
    const path = request.url.split('?')[0] ?? '';
    return path === '/health' || path.startsWith('/.well-known');
  },
});

await app.register(cors, {
  origin: (origin, cb) => {
    if (allowedOrigin(origin)) {
      cb(null, true);
      return;
    }
    cb(new Error('CORS origin not allowed'), false);
  },
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'mcp-session-id',
    'Mcp-Session-Id',
    'MCP-Protocol-Version',
    'Accept',
    'Last-Event-ID',
  ],
  exposedHeaders: ['mcp-session-id', 'Mcp-Session-Id'],
  credentials: true,
});

await app.register(formbody);
await registerOAuthRoutes(app);

app.get('/health', async () => ({
  ok: true,
  service: 'cross-model-memory-mcp',
}));

app.get('/.well-known/oauth-protected-resource', async (_request, reply) => {
  const resource = mcpPublicBaseUrl();
  if (!resource) {
    return reply.code(503).send({
      error: 'oauth_metadata_unconfigured',
      error_description:
        'Set MCP_PUBLIC_URL (or use RAILWAY_PUBLIC_DOMAIN) for OAuth discovery.',
    });
  }
  return reply.send({
    resource,
    authorization_servers: [resource],
    scopes_supported: ['mcp', 'openid', 'profile', 'read', 'suggest_write'],
    bearer_methods_supported: ['header'],
  });
});

async function mcpPostHandler(
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody: unknown,
  authHeader: string | undefined
): Promise<void> {
  const authCtx = await resolveMcpAuth(supabase, authHeader, req, res, authResolveOpts);
  if (!authCtx) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    const www = wwwAuthenticateUnauthorized();
    if (www) {
      res.setHeader('WWW-Authenticate', www);
    }
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message:
            'Unauthorized: OAuth access token from your app authorization server, mcp_tokens Bearer (SHA-256), or dev MCP_BEARER_TOKEN + SUPABASE_FALLBACK_USER_ID',
        },
        id: null,
      })
    );
    return;
  }

  const sessionIdHeader = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(sessionIdHeader)
    ? sessionIdHeader[0]
    : sessionIdHeader;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      if (sessionUserId[sessionId] !== authCtx.userId) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32002,
              message: 'Forbidden: MCP session belongs to a different user',
            },
            id: null,
          })
        );
        return;
      }
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(parsedBody)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
          sessionUserId[sid] = authCtx.userId;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          delete transports[sid];
          delete sessionUserId[sid];
        }
      };

      const captureBufferKey = process.env.REDIS_URL?.trim()
        ? `mcp:${randomUUID()}`
        : null;
      const mcp = createMemoryMcpServer({
        userId: authCtx.userId,
        scopes: authCtx.scopes,
        supabase,
        tokenId: authCtx.tokenId,
        captureBufferKey,
      });
      await mcp.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
      return;
    } else {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: missing session or invalid initialize',
          },
          id: null,
        })
      );
      return;
    }

    await transport.handleRequest(req, res, parsedBody);
  } catch (err) {
    app.log.error(err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        })
      );
    }
  }
}

async function mcpSessionHandler(
  req: IncomingMessage,
  res: ServerResponse,
  authHeader: string | undefined
): Promise<void> {
  const authCtx = await resolveMcpAuth(supabase, authHeader, req, res, authResolveOpts);
  if (!authCtx) {
    res.statusCode = 401;
    const www = wwwAuthenticateUnauthorized();
    if (www) {
      res.setHeader('WWW-Authenticate', www);
    }
    res.end('Unauthorized');
    return;
  }

  const sessionIdHeader = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(sessionIdHeader)
    ? sessionIdHeader[0]
    : sessionIdHeader;

  if (!sessionId || !transports[sessionId]) {
    res.statusCode = 400;
    res.end('Invalid or missing session ID');
    return;
  }

  if (sessionUserId[sessionId] !== authCtx.userId) {
    res.statusCode = 403;
    res.end('Forbidden: MCP session belongs to a different user');
    return;
  }

  const transport = transports[sessionId];
  try {
    await transport.handleRequest(req, res);
  } catch (err) {
    app.log.error(err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }
}

app.post('/mcp', async (request, reply) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigin(origin)) {
    reply.code(403).send('Forbidden origin');
    return;
  }

  await mcpPostHandler(
    request.raw,
    reply.raw,
    request.body,
    request.headers.authorization
  );
  reply.hijack();
});

app.get('/mcp', async (request, reply) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigin(origin)) {
    reply.code(403).send('Forbidden origin');
    return;
  }

  await mcpSessionHandler(
    request.raw,
    reply.raw,
    request.headers.authorization
  );
  reply.hijack();
});

app.delete('/mcp', async (request, reply) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigin(origin)) {
    reply.code(403).send('Forbidden origin');
    return;
  }

  await mcpSessionHandler(
    request.raw,
    reply.raw,
    request.headers.authorization
  );
  reply.hijack();
});

app.log.info(
  'Auth: OAuth access tokens (oauth_access_tokens), mcp_tokens SHA-256 Bearer, or MCP_BEARER_TOKEN + SUPABASE_FALLBACK_USER_ID (dev)'
);
for (const { level, msg } of getMcpAuthStartupLines()) {
  if (level === 'warn') {
    app.log.warn(msg);
  } else {
    app.log.info(msg);
  }
}
app.log.info(
  {
    explicitCorsCount: explicitOrigins.length,
    relaxLocalCors: isRelaxLocalCorsEnabled(),
  },
  'CORS: explicit origins (defaults + MCP_EXTRA_CORS_ORIGINS); optional MCP_RELAX_LOCAL_CORS for any localhost/127.0.0.1 port — see docs/MCP_CLIENT_CONNECTION.md'
);

const host = '0.0.0.0';
let boundPort = PORT;
for (let attempt = 0; attempt < 15; attempt++) {
  const tryPort = PORT + attempt;
  try {
    await app.listen({ port: tryPort, host });
    boundPort = tryPort;
    break;
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? (err as NodeJS.ErrnoException).code
        : '';
    if (code === 'EADDRINUSE' && attempt < 14) {
      continue;
    }
    throw err;
  }
}
if (boundPort !== PORT) {
  app.log.warn(
    { wanted: PORT, using: boundPort },
    'PORT was in use; bound to next free port — set PORT in .env or stop the other process'
  );
}
app.log.info(
  `Listening on http://${host}:${boundPort}  MCP: POST|GET|DELETE /mcp  OAuth bridge: /.well-known/oauth-authorization-server /oauth/* (proxies to OAUTH_ISSUER_URL)`
);

if (process.env.START_REDIS_WORKER_IN_PROCESS === 'true') {
  startMarkdownResyncWorker(app.log);
}

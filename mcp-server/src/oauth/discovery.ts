import type { FastifyReply, FastifyRequest } from 'fastify';
import { mcpPublicBaseUrl } from '../auth/oauthResource.js';

/** OAuth authorization-server metadata (RFC 8414-style); issuer = MCP public origin. */
export async function oauthDiscoveryHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const baseUrl = mcpPublicBaseUrl();
  if (!baseUrl) {
    return reply.code(503).send({
      error: 'oauth_metadata_unconfigured',
      error_description:
        'Set MCP_PUBLIC_URL (or use RAILWAY_PUBLIC_DOMAIN) for OAuth discovery.',
    });
  }

  return reply.send({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    scopes_supported: ['read', 'write', 'mcp'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    code_challenge_methods_supported: ['S256'],
    service_documentation: `${baseUrl}/docs/oauth`,
  });
}

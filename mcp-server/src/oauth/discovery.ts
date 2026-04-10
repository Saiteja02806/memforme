import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// OAuth discovery endpoint
export async function oauthDiscoveryHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const baseUrl = process.env.MCP_PUBLIC_URL || 'https://mcp-server-production-ddee.up.railway.app';
  
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

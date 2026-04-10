import type { FastifyInstance } from 'fastify';
import { oauthDiscoveryHandler } from './discovery.js';
import { oauthAuthorizeHandler } from './authorize.js';
import { oauthTokenHandler } from './token.js';
import { oauthUserinfoHandler } from './userinfo.js';
import { oauthRegisterHandler } from './register.js';
import { createOAuthClient, listOAuthClients, deleteOAuthClient } from './clients.js';

export async function registerOAuthRoutes(app: FastifyInstance): Promise<void> {
  // OAuth Discovery Endpoint
  app.get('/.well-known/oauth-authorization-server', oauthDiscoveryHandler);
  
  // OAuth Authorization Endpoint
  app.get('/oauth/authorize', oauthAuthorizeHandler);
  
  // OAuth Token Endpoint
  app.post('/oauth/token', oauthTokenHandler);
  
  // OAuth Userinfo Endpoint
  app.get('/oauth/userinfo', oauthUserinfoHandler);
  
  // OAuth Registration Endpoint
  app.post('/oauth/register', oauthRegisterHandler);
  
  // OAuth Client Management Endpoints (for authenticated users)
  app.post('/oauth/clients', createOAuthClient);
  app.get('/oauth/clients', listOAuthClients);
  app.delete('/oauth/clients/:client_id', deleteOAuthClient);
}

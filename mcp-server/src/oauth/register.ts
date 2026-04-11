import type { FastifyReply, FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';
import { getSupabaseServiceClient } from '../supabase/client.js';

const supabase = getSupabaseServiceClient();

// OAuth registration endpoint
export async function oauthRegisterHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { client_name, client_uri, redirect_uris, scopes } = request.body as any;
  
  // Generate OAuth client credentials
  const clientId = `mcp_${Math.random().toString(36).substring(2, 15)}`;
  const clientSecret = Math.random().toString(36).substring(2, 15);
  const clientSecretHash = createHash('sha256')
    .update(clientSecret)
    .digest('hex');
  
  // Store OAuth client
  const { error } = await supabase
    .from('oauth_clients')
    .insert({
      name: client_name || 'MCP Client',
      description: `Auto-registered client for ${client_uri || 'Unknown application'}`,
      redirect_uris: redirect_uris || [],
      scopes: scopes || ['read', 'write'],
      user_id: null, // Public clients don't have a user owner
      client_id: clientId,
      client_secret_hash: clientSecretHash,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    })
    .select();
  
  if (error) {
    return reply.code(500).send({ 
      error: 'server_error',
      error_description: 'Failed to register OAuth client'
    });
  }
  
  return reply.send({
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    registration_access_token: null, // Not implemented for public registration - v3
  });
}

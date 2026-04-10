import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseServiceClient } from '../supabase/client.js';

const supabase = getSupabaseServiceClient();

// Generate access token
function generateAccessToken(): { token: string; expires_at: Date } {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  return { token, expires_at: expiresAt };
}

// Validate client credentials
async function validateClientCredentials(clientId: string, clientSecret: string) {
  const { data: client } = await supabase
    .from('oauth_clients')
    .select('client_secret_hash, user_id, redirect_uris, scopes')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single();
  
  if (!client) {
    return null;
  }
  
  const clientSecretHash = createHash('sha256').update(clientSecret).digest('hex');
  if (clientSecretHash !== client.client_secret_hash) {
    return null;
  }
  
  return client;
}

// OAuth token endpoint
export async function oauthTokenHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { grant_type, code, client_id, client_secret, redirect_uri } = request.body as any;
  
  // Validate grant type
  if (grant_type !== 'authorization_code') {
    return reply.code(400).send({ 
      error: 'unsupported_grant_type',
      error_description: 'Only authorization_code grant type is supported'
    });
  }
  
  // Validate client credentials
  const client = await validateClientCredentials(client_id, client_secret);
  if (!client) {
    return reply.code(401).send({ 
      error: 'invalid_client',
      error_description: 'Invalid client credentials'
    });
  }
  
  // Validate redirect URI
  if (!client.redirect_uris.includes(redirect_uri)) {
    return reply.code(400).send({ 
      error: 'invalid_request',
      error_description: 'Invalid redirect_uri'
    });
  }
  
  // Exchange authorization code for access token
  const { data: authCode } = await supabase
    .from('oauth_authorization_codes')
    .select('code, user_id, scope, expires_at')
    .eq('code', code)
    .eq('client_id', client_id)
    .single();
  
  if (!authCode) {
    return reply.code(400).send({ 
      error: 'invalid_grant',
      error_description: 'Invalid authorization code'
    });
  }
  
  // Check if authorization code has expired
  if (new Date() > new Date(authCode.expires_at)) {
    return reply.code(400).send({ 
      error: 'invalid_grant',
      error_description: 'Authorization code expired'
    });
  }
  
  // Generate access token
  const { token, expires_at } = generateAccessToken();
  
  // Store access token
  const { error } = await supabase
    .from('oauth_access_tokens')
    .insert({
      access_token: token,
      client_id,
      user_id: authCode.user_id,
      scope: authCode.scope,
      expires_at: expires_at.toISOString(),
    })
    .select();
  
  if (error) {
    return reply.code(500).send({ 
      error: 'server_error',
      error_description: 'Failed to generate access token'
    });
  }
  
  // Delete used authorization code
  await supabase
    .from('oauth_authorization_codes')
    .delete()
    .eq('code', code);
  
  return reply.send({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: authCode.scope,
  });
}

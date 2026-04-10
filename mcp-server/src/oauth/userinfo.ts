import type { FastifyReply, FastifyRequest } from 'fastify';
import { mcpPublicBaseUrl } from '../auth/oauthResource.js';
import { getSupabaseServiceClient } from '../supabase/client.js';
import { scopesFromDb } from './scopeUtils.js';

const supabase = getSupabaseServiceClient();

// OAuth userinfo endpoint
export async function oauthUserinfoHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ 
      error: 'invalid_token',
      error_description: 'Bearer token required'
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  // Validate access token
  const { data: accessToken } = await supabase
    .from('oauth_access_tokens')
    .select('user_id, scope, expires_at')
    .eq('access_token', token)
    .eq('is_active', true)
    .single();
  
  if (!accessToken) {
    return reply.code(401).send({ 
      error: 'invalid_token',
      error_description: 'Invalid access token'
    });
  }
  
  // Check if token has expired
  if (new Date() > new Date(accessToken.expires_at)) {
    return reply.code(401).send({ 
      error: 'invalid_token',
      error_description: 'Access token expired'
    });
  }
  
  const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(
    accessToken.user_id
  );

  if (userErr || !userData?.user) {
    return reply.code(500).send({
      error: 'server_error',
      error_description: userErr?.message || 'User not found',
    });
  }

  const user = userData.user;
  
  // Update last used timestamp
  await supabase
    .from('oauth_access_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('access_token', token);
  
  const iss = mcpPublicBaseUrl();
  return reply.send({
    sub: user.id,
    email: user.email,
    scopes: scopesFromDb(accessToken.scope),
    ...(iss ? { iss } : {}),
  });
}

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getSupabaseServiceClient } from '../supabase/client.js';

const supabase = getSupabaseServiceClient();

// Authenticate OAuth access token
export async function authenticateOAuthToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ userId: string; scopes: string[] } | null> {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
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
    return null;
  }
  
  // Check if token has expired
  if (new Date() > new Date(accessToken.expires_at)) {
    return null;
  }
  
  return {
    userId: accessToken.user_id,
    scopes: accessToken.scope,
  };
}

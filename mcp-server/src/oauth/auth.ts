import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseServiceClient } from '../supabase/client.js';

const supabase = getSupabaseServiceClient();

// Authenticate OAuth access token (overloaded for different request types)
export async function authenticateOAuthToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ userId: string; scopes: string[] } | null>;

export async function authenticateOAuthToken(
  request: IncomingMessage,
  reply: ServerResponse
): Promise<{ userId: string; scopes: string[] } | null>;

export async function authenticateOAuthToken(
  request: FastifyRequest | IncomingMessage,
  reply: FastifyReply | ServerResponse
): Promise<{ userId: string; scopes: string[] } | null> {
  const authHeader = 'headers' in request ? request.headers.authorization : undefined;
  
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

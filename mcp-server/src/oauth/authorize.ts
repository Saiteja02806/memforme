import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseServiceClient } from '../supabase/client.js';

const supabase = getSupabaseServiceClient();

// Generate authorization code
function generateAuthorizationCode(): string {
  return randomBytes(32).toString('hex');
}

// OAuth authorization endpoint
export async function oauthAuthorizeHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { response_type, client_id, redirect_uri, scope, state } = request.query as any;
  
  // Validate required parameters
  if (!response_type || response_type !== 'code') {
    return reply.code(400).send({ 
      error: 'invalid_request',
      error_description: 'response_type must be code'
    });
  }
  
  if (!client_id) {
    return reply.code(400).send({ 
      error: 'invalid_request',
      error_description: 'client_id is required'
    });
  }
  
  if (!redirect_uri) {
    return reply.code(400).send({ 
      error: 'invalid_request',
      error_description: 'redirect_uri is required'
    });
  }
  
  // Verify OAuth client
  const { data: client } = await supabase
    .from('oauth_clients')
    .select('id, name, redirect_uris, scopes, user_id')
    .eq('client_id', client_id)
    .eq('is_active', true)
    .single();
  
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

  const fallbackUser = process.env.OAUTH_AUTHORIZATION_USER_ID?.trim();
  const effectiveUserId = client.user_id ?? (fallbackUser || null);
  if (!effectiveUserId) {
    return reply.code(503).send({
      error: 'server_error',
      error_description:
        'OAuth client has no user_id; set OAUTH_AUTHORIZATION_USER_ID to a valid auth.users UUID for dynamic-registration clients.',
    });
  }
  
  // Generate authorization code
  const code = generateAuthorizationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  // Store authorization code
  const { error } = await supabase
    .from('oauth_authorization_codes')
    .insert({
      code,
      client_id,
      redirect_uri,
      scope: scope || 'read write',
      user_id: effectiveUserId,
      expires_at: expiresAt.toISOString(),
    })
    .select();
  
  if (error) {
    return reply.code(500).send({ 
      error: 'server_error',
      error_description: 'Failed to generate authorization code'
    });
  }
  
  // Redirect back to client with authorization code
  const redirectUrl = `${redirect_uri}?code=${code}${state ? `&state=${state}` : ''}`;
  
  return reply.redirect(redirectUrl);
}

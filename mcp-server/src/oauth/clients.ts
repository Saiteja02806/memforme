import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseServiceClient } from '../supabase/client.js';

const supabase = getSupabaseServiceClient();

// Generate OAuth client ID and secret
export function generateOAuthCredentials() {
  const clientId = `mcp_${randomBytes(16).toString('hex')}`;
  const clientSecret = randomBytes(32).toString('hex');
  const clientSecretHash = createHash('sha256').update(clientSecret).digest('hex');
  
  return {
    client_id: clientId,
    client_secret: clientSecret,
    client_secret_hash: clientSecretHash,
  };
}

// Create OAuth client
export async function createOAuthClient(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { name, description, redirect_uris, scopes } = request.body as any;
  const authHeader = request.headers.authorization;
  
  // Authenticate user (using existing Bearer token system)
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  
  // Get user from token
  const { data: user } = await supabase.rpc('get_user_by_bearer_token', { token });
  if (!user) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
  
  // Generate OAuth credentials
  const credentials = generateOAuthCredentials();
  
  // Store OAuth client
  const { error } = await supabase
    .from('oauth_clients')
    .insert({
      name,
      description,
      redirect_uris,
      scopes: scopes || ['read', 'write'],
      user_id: user.id,
      client_id: credentials.client_id,
      client_secret_hash: credentials.client_secret_hash,
    })
    .select();
  
  if (error) {
    return reply.code(500).send({ error: 'Failed to create OAuth client' });
  }
  
  return reply.send({
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    name,
    description,
    redirect_uris,
    scopes,
  });
}

// List OAuth clients for user
export async function listOAuthClients(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  
  const { data: user } = await supabase.rpc('get_user_by_bearer_token', { token });
  if (!user) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
  
  const { data: clients, error } = await supabase
    .from('oauth_clients')
    .select('id, name, description, client_id, redirect_uris, scopes, created_at, is_active')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    return reply.code(500).send({ error: 'Failed to fetch OAuth clients' });
  }
  
  return reply.send({ clients });
}

// Delete OAuth client
export async function deleteOAuthClient(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  
  const { data: user } = await supabase.rpc('get_user_by_bearer_token', { token });
  if (!user) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
  
  const { client_id } = request.body as any;
  if (!client_id) {
    return reply.code(400).send({ error: 'Client ID required' });
  }
  
  // Verify client belongs to user
  const { data: client } = await supabase
    .from('oauth_clients')
    .select('user_id')
    .eq('client_id', client_id)
    .single();
  
  if (!client || client.user_id !== user.id) {
    return reply.code(404).send({ error: 'OAuth client not found' });
  }
  
  // Delete client and its tokens
  const { error } = await supabase
    .from('oauth_clients')
    .delete()
    .eq('client_id', client_id);
    
  if (error) {
    return reply.code(500).send({ error: 'Failed to delete OAuth client' });
  }
  
  return reply.send({ success: true });
}

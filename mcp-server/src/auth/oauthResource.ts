/**
 * MCP OAuth 2.0 protected-resource metadata (RFC 9728) + 401 WWW-Authenticate hints.
 */

export function mcpPublicBaseUrl(): string | null {
  const fromEnv = process.env.MCP_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
  }
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (domain) {
    return `https://${domain}`;
  }
  return null;
}

export function oauthProtectedResourceMetadataUrl(): string | null {
  const base = mcpPublicBaseUrl();
  if (!base) {
    return null;
  }
  return `${base}/.well-known/oauth-protected-resource`;
}

export function wwwAuthenticateUnauthorized(): string | undefined {
  const md = oauthProtectedResourceMetadataUrl();
  if (!md) {
    return undefined;
  }
  return `Bearer error="invalid_token", error_description="Missing or invalid access token", resource_metadata="${md}"`;
}

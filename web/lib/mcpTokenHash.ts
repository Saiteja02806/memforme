/**
 * Must match MCP server: SHA-256 UTF-8 digest, lowercase hex (see mcp-server resolveMcpUser).
 */
export async function sha256HexUtf8(secret: string): Promise<string> {
  const enc = new TextEncoder().encode(secret);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 32 random bytes as 64-char hex — strong Bearer secret. */
export function generatePlainToken(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * CORS allowlist for Streamable HTTP MCP (/mcp).
 * Browsers (ChatGPT web, MCP Inspector UI) send Origin; CLI/curl often omit it (allowed).
 */

const DEFAULT_CORS_ORIGINS = [
  'https://chatgpt.com',
  'https://chat.openai.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3005',
  'http://127.0.0.1:3005',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:6274',
  'http://127.0.0.1:6274',
] as const;

function parseExtraOrigins(): string[] {
  const raw = process.env.MCP_EXTRA_CORS_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function isRelaxLocalCorsEnabled(): boolean {
  const v = process.env.MCP_RELAX_LOCAL_CORS?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export type CorsAllowlist = {
  /** Return true when the Origin header may call /mcp (or when Origin is absent). */
  allowedOrigin: (origin: string | undefined) => boolean;
  /** Fixed list (defaults + MCP_EXTRA_CORS_ORIGINS) for logging. */
  explicitOrigins: string[];
};

export function createCorsAllowlist(): CorsAllowlist {
  const explicitOrigins = [
    ...DEFAULT_CORS_ORIGINS,
    ...parseExtraOrigins(),
  ];
  const set = new Set(explicitOrigins);
  const relax = isRelaxLocalCorsEnabled();

  return {
    explicitOrigins,
    allowedOrigin(origin: string | undefined): boolean {
      if (!origin) {
        return true;
      }
      if (set.has(origin)) {
        return true;
      }
      if (relax && isLocalhostOrigin(origin)) {
        return true;
      }
      return false;
    },
  };
}

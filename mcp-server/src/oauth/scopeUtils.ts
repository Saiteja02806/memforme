/** Normalize DB `scope` (text or text[]) for MCP scope checks. */
export function scopesFromDb(scope: unknown): string[] {
  if (Array.isArray(scope)) {
    return scope.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof scope === 'string') {
    return scope.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

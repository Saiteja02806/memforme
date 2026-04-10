/**
 * Normalize secrets/UUIDs from process.env the same way as `scripts/smoke-test.mjs`
 * (trim + strip one pair of surrounding ASCII quotes — common in .env files).
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function stripOuterQuotesTrim(s: string | undefined): string {
  if (s == null || s === '') {
    return '';
  }
  return s.trim().replace(/^["']|["']$/g, '').trim();
}

export function normalizeEnvBearerSecret(raw: string | undefined): string | null {
  const t = stripOuterQuotesTrim(raw);
  return t.length > 0 ? t : null;
}

/** Returns null if missing or not a valid UUID (dev fallback disabled). */
export function normalizeFallbackUserId(raw: string | undefined): string | null {
  const t = stripOuterQuotesTrim(raw);
  if (!t) {
    return null;
  }
  if (!UUID_REGEX.test(t)) {
    return null;
  }
  return t;
}

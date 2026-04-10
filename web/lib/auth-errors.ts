/**
 * Map Supabase Auth / REST errors to actionable copy for users.
 */
export function friendlySupabaseError(raw: string): string {
  const m = raw.trim();
  const lower = m.toLowerCase();

  if (lower.includes('invalid api key') || lower === 'invalid api key') {
    return [
      'Invalid API key — almost always the wrong Supabase key in web/.env.local.',
      '',
      'Fix: Supabase Dashboard → Settings → API → copy the anon public key into NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      'Do not use the service_role secret here (that key is only for mcp-server on the server).',
      'After changing .env.local, stop and restart npm run web:dev.',
    ].join(' ');
  }

  if (lower.includes('email not confirmed') || lower.includes('confirm your mail')) {
    return `${m} Open the link in the email Supabase sent, or disable "Confirm email" under Authentication → Providers → Email for development.`;
  }

  return m;
}

import { describeSupabasePublicEnv } from '@/lib/describe-supabase-env';

/**
 * Server-rendered banner when public Supabase env is missing or misconfigured (e.g. service_role in browser).
 */
export function SupabaseEnvNotice() {
  const status = describeSupabasePublicEnv();
  if (status.ok) {
    return null;
  }

  return (
    <div className="env-banner env-banner-error" role="alert">
      <strong>{status.title}</strong>
      <p className="env-banner-detail">{status.detail}</p>
    </div>
  );
}

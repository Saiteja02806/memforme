import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import { SignOutButton } from './SignOutButton';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="dashboard-shell">
      <header className="dash-header">
        <Link href="/dashboard" className="dash-brand">
          Memforme
        </Link>
        <nav className="dash-nav">
          <Link href="/dashboard">Overview</Link>
          <Link href="/connect">Setup guide</Link>
          <Link href="/dashboard/connect">Connect AI</Link>
          <Link href="/dashboard/tokens">Tokens</Link>
          <Link href="/dashboard/memory">Memory files</Link>
          <SignOutButton />
        </nav>
      </header>
      <div className="dash-body">{children}</div>
    </div>
  );
}

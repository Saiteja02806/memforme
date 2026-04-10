import Link from 'next/link';
import { IntegrationChecklist } from '@/components/IntegrationChecklist';
import { createServerSupabase } from '@/lib/supabase-server';

export default async function DashboardHomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="dashboard-shell">
      <div className="dash-header">
        <div className="dash-brand">Memforme</div>
        <nav className="dash-nav">
          <Link href="/dashboard/connect" className="text-blue-600 hover:underline">Connect</Link>
          <Link href="/dashboard/tokens" className="text-blue-600 hover:underline">Tokens</Link>
          <Link href="/dashboard/memory" className="text-blue-600 hover:underline">Memory</Link>
          <Link href="/dashboard/connect" className="text-blue-600 hover:underline">Settings</Link>
        </nav>
      </div>

      <div className="dash-body">
        <div className="welcome-block">
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-gray-600">
            You&apos;re signed in as <strong className="text-gray-900">{user?.email ?? user?.id}</strong>. 
            Use the checklist below to confirm this app and your MCP server are pointed at the same Supabase project and encryption key.
          </p>
        </div>

        <div className="mt-8">
          <IntegrationChecklist />
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/connect" className="card card-elevated hover:bg-blue-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div>
                  <div className="font-medium">Setup Guide</div>
                  <div className="text-sm text-gray-600">Get started</div>
                </div>
              </div>
            </Link>
            
            <Link href="/dashboard/connect" className="card card-elevated hover:bg-green-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <div>
                  <div className="font-medium">Connect AI</div>
                  <div className="text-sm text-gray-600">Generate token</div>
                </div>
              </div>
            </Link>
            
            <Link href="/dashboard/tokens" className="card card-elevated hover:bg-purple-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <div>
                  <div className="font-medium">Manage Tokens</div>
                  <div className="text-sm text-gray-600">View & revoke</div>
                </div>
              </div>
            </Link>
            
            <Link href="/dashboard/memory" className="card card-elevated hover:bg-orange-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold">4</span>
                </div>
                <div>
                  <div className="font-medium">View Memory</div>
                  <div className="text-sm text-gray-600">Browse entries</div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-medium mb-2">Documentation</h3>
              <p className="text-sm text-gray-600 mb-3">
                Complete guides for setup, configuration, and troubleshooting.
              </p>
              <Link href="/connect" className="text-sm text-blue-600 hover:underline">
                View docs &rarr;
              </Link>
            </div>
            
            <div className="card">
              <h3 className="font-medium mb-2">Developer Tools</h3>
              <p className="text-sm text-gray-600 mb-3">
                SQL hash generator and MCP server health check utilities.
              </p>
              <Link href="/dev/setup" className="text-sm text-blue-600 hover:underline">
                Access tools &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

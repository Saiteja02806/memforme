import Link from 'next/link';
import { HeroSection } from '@/components/HeroSection';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      
      {/* How it works section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Create Account</h3>
                <p className="text-sm text-gray-600">
                  Sign up with Supabase Auth. Your user ID ties tokens and memory together.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Deploy MCP</h3>
                <p className="text-sm text-gray-600">
                  Run the MCP server with your project keys (see repo docs).
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Connect AI Tools</h3>
                <p className="text-sm text-gray-600">
                  Follow the <Link href="/connect" className="text-blue-600 hover:underline">setup guide</Link> to connect ChatGPT, Claude, and more.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold">4</span>
                </div>
                <h3 className="font-semibold mb-2">Manage Memory</h3>
                <p className="text-sm text-gray-600">
                  View and edit your memory files in the dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer tools section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-8">Developer Tools</h2>
            <p className="text-gray-600 mb-8">
              SQL hash helper and health proxy (no login required)
            </p>
            
            <div className="flex justify-center gap-4">
              <Link 
                href="/dev/setup" 
                className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Token SQL Generator
              </Link>
              <Link 
                href="/dev/check" 
                className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Health Check
              </Link>
            </div>
            
            <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-2">Documentation</h3>
              <p className="text-sm text-blue-800">
                <code className="bg-blue-100 px-2 py-1 rounded">docs/DEPLOY_MILESTONE_A.md</code>
                {' · '}
                <code className="bg-blue-100 px-2 py-1 rounded">docs/MCP_CLIENT_CONNECTION.md</code>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

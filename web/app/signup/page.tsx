import Link from 'next/link';
import { Suspense } from 'react';
import { SignupForm } from '@/components/SignupForm';
import { SupabaseEnvNotice } from '@/components/SupabaseEnvNotice';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Memforme</h1>
          <p className="text-gray-600">Cross-model memory for all your AI tools</p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create account</h2>
            <p className="text-sm text-gray-600">
              Join thousands of users who never repeat themselves to AI again
            </p>
          </div>

          <SupabaseEnvNotice />
          
          <Suspense fallback={
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-500 mt-2">Loading&hellip;</p>
            </div>
          }>
            <SignupForm />
          </Suspense>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By signing up, you agree to our terms and privacy policy
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center"
          >
            <span className="mr-1">&larr;</span>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client'

import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <div className="inline-block mb-4 px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
              🧠 Cross-Model Memory Layer
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Your AI Memory,
              <span className="text-blue-600"> Everywhere</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
              Stop repeating yourself. Memforme creates a unified memory layer that works across 
              ChatGPT, Claude, and all your AI tools. Your context, preferences, and decisions 
              follow you seamlessly.
            </p>
          </div>

          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link 
              href="/signup" 
              className="inline-flex items-center px-8 py-3 text-base font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Get Started
              <span className="ml-2">→</span>
            </Link>
            <Link 
              href="/login" 
              className="inline-flex items-center px-8 py-3 text-base font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">Smart Memory</h3>
              <p className="mt-2 text-sm text-gray-600">
                AI-powered context management that learns and adapts
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">Lightning Fast</h3>
              <p className="mt-2 text-sm text-gray-600">
                Instant context switching between AI models
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">Secure & Private</h3>
              <p className="mt-2 text-sm text-gray-600">
                End-to-end encryption keeps your memories safe
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${className}`}>
      {children}
    </span>
  )
}

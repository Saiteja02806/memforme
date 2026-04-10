import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /**
   * Pin tracing to this app directory so Next does not treat the repo root lockfile as the app root
   * (which can corrupt `.next/server` chunk paths like missing `./611.js`).
   */
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/setup', destination: '/dev/setup', permanent: false },
      { source: '/check', destination: '/dev/check', permanent: false },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The original Vite app did not run under StrictMode. Double-invoked effects in dev
  // would trigger duplicate room joins from invite links (?room=CODE), so keep it off.
  reactStrictMode: false,
};

export default nextConfig;

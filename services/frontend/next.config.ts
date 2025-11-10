import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Externalize bull package - it's Node.js-only and incompatible with Next.js build
  serverExternalPackages: ['bull'],
  // Add empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel deployment
  serverExternalPackages: ['chromadb'],
  // Handle dynamic imports
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'chromadb'];
    return config;
  }
};

export default nextConfig;

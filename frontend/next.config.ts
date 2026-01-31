import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack for production builds due to native module compatibility
  experimental: {
    serverComponentsExternalPackages: ['bash-tool', 'just-bash', '@mongodb-js/zstd'],
  },
  // Mark native packages as external
  serverExternalPackages: ['bash-tool', 'just-bash'],
};

export default nextConfig;

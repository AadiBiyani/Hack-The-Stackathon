import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark native packages as external for server-side bundling
  serverExternalPackages: ['bash-tool', 'just-bash', '@mongodb-js/zstd'],
};

export default nextConfig;

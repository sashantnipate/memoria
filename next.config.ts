import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

  allowedDevOrigins: [
    "localhost:3000"
  ],

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
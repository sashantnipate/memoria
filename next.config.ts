import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

  allowedDevOrigins: [
    "among-chart-estimate-restricted.trycloudflare.com",
    "localhost:3000"
  ],
};

export default nextConfig;
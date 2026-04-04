import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

  allowedDevOrigins: [
    "formats-demonstrates-picnic-own.trycloudflare.com",
    "localhost:3000"
  ],
};

export default nextConfig;
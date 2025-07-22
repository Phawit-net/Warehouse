import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["localhost"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5001",
      },
    ],
  },
};

export default nextConfig;

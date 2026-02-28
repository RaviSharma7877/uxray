import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Suppress HMR ping errors in development
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Add experimental features to handle HMR better
  experimental: {
    // @ts-ignore
    webpackBuildWorker: true,
  },
};

export default nextConfig;

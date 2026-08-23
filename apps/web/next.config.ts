import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tonala/ui", "@tonala/config"],
  experimental: {
    externalDir: true
  },
  webpack(config: { resolve: { extensionAlias: Record<string, string[]> } }) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"]
    };
    return config;
  }
};

export default nextConfig;

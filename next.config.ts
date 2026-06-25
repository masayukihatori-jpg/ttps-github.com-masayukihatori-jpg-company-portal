import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    // Worker threadsを使ってPostCSSプラグインを実行（子プロセスのspawnが不要になる）
    turbopackPluginRuntimeStrategy: "workerThreads",
  },
};

export default nextConfig;

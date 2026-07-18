import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  experimental: {
    devtoolSegmentExplorer: false,
  },
  turbopack: {
    root: workspaceRoot
  },
  transpilePackages: ["@hhousing/api-contracts", "@hhousing/data-access", "@hhousing/domain"],
  async headers() {
    return [
      {
        source: "/api/mobile/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Accept, X-Requested-With" },
          { key: "Access-Control-Max-Age", value: "86400" }
        ]
      }
    ];
  }
};

export default nextConfig;

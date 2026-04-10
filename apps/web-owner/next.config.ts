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
};

export default nextConfig;

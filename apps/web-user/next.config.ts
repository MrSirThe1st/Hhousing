import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep tracing within this monorepo to avoid parent-folder lockfile detection.
  outputFileTracingRoot: path.join(__dirname, "../../")
};

export default nextConfig;

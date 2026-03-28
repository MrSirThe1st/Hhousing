import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hhousing/api-contracts", "@hhousing/data-access", "@hhousing/domain"],
};

export default nextConfig;

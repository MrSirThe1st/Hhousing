import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const posthogAssetsHost = posthogHost.includes("eu.")
  ? "https://eu-assets.i.posthog.com"
  : "https://us-assets.i.posthog.com";

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  experimental: {
    devtoolSegmentExplorer: false,
  },
  devIndicators: false,
  turbopack: {
    root: workspaceRoot
  },
  transpilePackages: ["@hhousing/api-contracts", "@hhousing/data-access", "@hhousing/domain"],
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`
      },
      {
        source: "/ingest/array/:path*",
        destination: `${posthogAssetsHost}/array/:path*`
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`
      }
    ];
  },
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

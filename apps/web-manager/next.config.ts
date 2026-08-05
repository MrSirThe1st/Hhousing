import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
const appDir = fileURLToPath(new URL(".", import.meta.url));

/**
 * next.config is evaluated before Next always injects .env into process.env
 * in every tooling path. Load the app env file ourselves so PostHog rewrites
 * always target the correct region (EU project → eu-assets, not us-assets).
 */
function loadLocalEnv(): void {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(appDir, fileName);
    if (!existsSync(envPath)) {
      continue;
    }

    const contents = readFileSync(envPath, "utf8");
    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadLocalEnv();

// Hhousing PostHog project is on EU cloud — never fall back to US assets.
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
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

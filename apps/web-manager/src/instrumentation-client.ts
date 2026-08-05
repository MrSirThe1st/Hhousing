import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const configuredHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const isEu = configuredHost.includes("eu.");

if (!projectToken) {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[PostHog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is missing — analytics events will not be sent."
    );
  }
} else {
  posthog.init(projectToken, {
    // Same-origin reverse proxy (see next.config.ts rewrites). Avoids ad-blockers
    // and keeps region routing in one place.
    api_host: "/ingest",
    ui_host: isEu ? "https://eu.posthog.com" : "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true",
  });
}

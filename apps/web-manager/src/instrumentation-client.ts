import posthog from "posthog-js";

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (!posthogToken) {
  if (process.env.NODE_ENV === "development") {
    console.error(
      new Error(
        "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured"
      )
    );
  }
} else {
  posthog.init(posthogToken, {
    api_host: "/ingest",
    ui_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.includes("eu.")
        ? "https://eu.posthog.com"
        : "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
    tracing_headers: ["localhost", "www.harakaproperty.com", "harakaproperty.com"]
  });
}

import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;
let missingTokenWarned = false;

function warnMissingToken(): void {
  if (missingTokenWarned || process.env.NODE_ENV === "production") {
    return;
  }

  missingTokenWarned = true;
  console.error(
    new Error(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured"
    )
  );
}

export function getPostHogClient(): PostHog | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) {
    warnMissingToken();
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(token, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true
    });

    if (process.env.NODE_ENV === "development") {
      posthogClient.debug(true);
    }
  }

  return posthogClient;
}

export function readPostHogDistinctId(request: Request, fallbackDistinctId: string): string {
  const headerDistinctId = request.headers.get("x-posthog-distinct-id")?.trim();
  if (headerDistinctId && headerDistinctId.length > 0) {
    return headerDistinctId;
  }

  return fallbackDistinctId;
}

export async function captureServerEvent(options: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const posthog = getPostHogClient();
  if (!posthog) {
    return;
  }

  posthog.capture({
    distinctId: options.distinctId,
    event: options.event,
    properties: options.properties
  });
  await posthog.flush();
}

export async function captureServerException(
  error: unknown,
  distinctId: string
): Promise<void> {
  const posthog = getPostHogClient();
  if (!posthog) {
    return;
  }

  posthog.captureException(error, distinctId);
  await posthog.flush();
}

export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}

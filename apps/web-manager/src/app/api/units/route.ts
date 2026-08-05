import { createUnit } from "../../../api";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import {
  captureServerEvent,
  readPostHogDistinctId
} from "../../../lib/posthog-server";
import { createId, createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../shared";

export async function POST(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;
  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  if (typeof body === "object" && body !== null) {
    const payload = body as Record<string, unknown>;
    const propertyId = typeof payload.propertyId === "string" ? payload.propertyId : null;

    if (propertyId !== null) {
      const scopedPortfolio = await getScopedPortfolioData(session);
      if (!scopedPortfolio.propertyIds.has(propertyId)) {
        return jsonResponse(404, {
          success: false,
          code: "NOT_FOUND",
          error: "Property not found"
        });
      }
    }
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const result = await createUnit(
    {
      body,
      session
    },
    {
      repository: repositoryResult.data,
      createId: () => createId("unt")
    }
  );

  if (result.body.success) {
    await captureServerEvent({
      distinctId: readPostHogDistinctId(request, session.userId),
      event: "unit_created",
      properties: {
        organization_id: session.organizationId,
        source: "api"
      }
    });
  }

  return jsonResponse(result.status, result.body);
}

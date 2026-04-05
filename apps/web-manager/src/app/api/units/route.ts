import { createUnit } from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { createId, createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../shared";

export async function POST(request: Request): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
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

  if (session !== null && typeof body === "object" && body !== null) {
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

  return jsonResponse(result.status, result.body);
}

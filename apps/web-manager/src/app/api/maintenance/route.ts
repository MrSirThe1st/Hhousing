import {
  createMaintenanceRequest,
  listMaintenanceRequests
} from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import {
  filterMaintenanceRequestsByScope,
  getScopedPortfolioData
} from "../../../lib/operator-scope-portfolio";
import { createId, createMaintenanceRepo, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../shared";

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
    const unitId = typeof payload.unitId === "string" ? payload.unitId : null;

    if (unitId !== null) {
      const scopedPortfolio = await getScopedPortfolioData(session);
      if (!scopedPortfolio.unitIds.has(unitId)) {
        return jsonResponse(404, {
          success: false,
          code: "NOT_FOUND",
          error: "Unit not found"
        });
      }
    }
  }

  const result = await createMaintenanceRequest(
    {
      body,
      session
    },
    {
      repository: createMaintenanceRepo(),
      createId: () => createId("mnt"),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const session = await extractAuthSessionFromCookies();

  const result = await listMaintenanceRequests(
    {
      organizationId: searchParams.get("organizationId"),
      unitId: searchParams.get("unitId"),
      status: searchParams.get("status"),
      session
    },
    { repository: createMaintenanceRepo(), teamFunctionsRepository: createTeamFunctionsRepo() }
  );

  if (result.body.success && session !== null) {
    const scopedPortfolio = await getScopedPortfolioData(session);
    return jsonResponse(result.status, {
      success: true,
      data: {
        requests: filterMaintenanceRequestsByScope(result.body.data.requests, scopedPortfolio)
      }
    });
  }

  return jsonResponse(result.status, result.body);
}

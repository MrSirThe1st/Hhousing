import {
  createMaintenanceRequest,
  listMaintenanceRequests
} from "../../../api";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { rejectIfIndividualExperience } from "../../../lib/entreprise-experience-guard";
import {
  filterMaintenanceRequestsByScope,
  getScopedPortfolioData
} from "../../../lib/operator-scope-portfolio";
import {
  captureServerEvent,
  readPostHogDistinctId
} from "../../../lib/posthog-server";
import { createId, createMaintenanceRepo, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../shared";

export async function POST(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;
  const experienceDenied = await rejectIfIndividualExperience(session);
  if (experienceDenied !== null) {
    return experienceDenied;
  }

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

  if (result.body.success) {
    const priority =
      typeof body === "object" && body !== null && typeof (body as { priority?: unknown }).priority === "string"
        ? (body as { priority: string }).priority
        : undefined;

    await captureServerEvent({
      distinctId: readPostHogDistinctId(request, session.userId),
      event: "maintenance_request_created",
      properties: {
        organization_id: session.organizationId,
        priority,
        source: "api"
      }
    });
  }

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;
  const experienceDenied = await rejectIfIndividualExperience(session);
  if (experienceDenied !== null) {
    return experienceDenied;
  }

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

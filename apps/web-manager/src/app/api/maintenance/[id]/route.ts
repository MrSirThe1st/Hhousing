import { updateMaintenanceRequest } from "../../../../api";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { requirePermission } from "../../../../api/organizations/permissions";
import { Permission } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { createMaintenanceRepo, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../../shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permissionResult = await requirePermission(
    access.data,
    Permission.VIEW_MAINTENANCE,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(403, permissionResult);
  }

  const repository = createMaintenanceRepo();

  try {
    const [maintenanceRequest, timeline] = await Promise.all([
      repository.getMaintenanceRequestById(id, access.data.organizationId),
      repository.listMaintenanceRequestTimeline(id, access.data.organizationId)
    ]);

    if (!maintenanceRequest) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Maintenance request not found"
      });
    }

    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.unitIds.has(maintenanceRequest.unitId)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Maintenance request not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: {
        request: maintenanceRequest,
        timeline
      }
    });
  } catch (error) {
    console.error("Failed to fetch maintenance request", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch maintenance request"
    });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();

  const access = requireOperatorSession(session);
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const maintenanceRepository = createMaintenanceRepo();
  const existingRequest = await maintenanceRepository.getMaintenanceRequestById(id, access.data.organizationId);
  if (!existingRequest) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Maintenance request not found"
    });
  }

  const scopedPortfolio = await getScopedPortfolioData(access.data);
  if (!scopedPortfolio.unitIds.has(existingRequest.unitId)) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Maintenance request not found"
    });
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

  const result = await updateMaintenanceRequest(
    {
      requestId: id,
      body,
      session
    },
    { repository: maintenanceRepository, teamFunctionsRepository: createTeamFunctionsRepo() }
  );

  return jsonResponse(result.status, result.body);
}

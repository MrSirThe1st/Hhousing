import {
  Permission,
  parseUpsertMoveOutInspectionInput,
  type UpsertMoveOutInspectionOutput
} from "@hhousing/api-contracts";
import { upsertLeaseMoveOutInspection } from "../../../../../../api/leases/move-out";
import { requirePermission } from "../../../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../../../lib/operator-scope-portfolio";
import {
  createId,
  createTeamFunctionsRepo,
  createTenantLeaseRepo,
  jsonResponse,
  parseJsonBody
} from "../../../../shared";

export async function PATCH(
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
    Permission.EDIT_LEASE,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
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

  const parsed = parseUpsertMoveOutInspectionInput(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  const repository = createTenantLeaseRepo();
  const [lease, scopedPortfolio] = await Promise.all([
    repository.getLeaseById(id, access.data.organizationId),
    getScopedPortfolioData(access.data)
  ]);

  if (!lease || !scopedPortfolio.leaseIds.has(id)) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Lease not found" });
  }

  try {
    await upsertLeaseMoveOutInspection(
      lease,
      parsed.data,
      access.data.memberships.find((membership) => membership.organizationId === access.data.organizationId)?.id ?? null,
      repository,
      createId
    );
    const aggregate = await repository.getMoveOutByLeaseId(lease.id, lease.organizationId);

    if (!aggregate?.inspection) {
      return jsonResponse(500, {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to load saved inspection"
      });
    }

    const data: UpsertMoveOutInspectionOutput = aggregate.inspection;
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "MOVE_OUT_NOT_STARTED") {
      return jsonResponse(409, {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Start a move-out before saving an inspection"
      });
    }

    if (error instanceof Error && error.message === "MOVE_OUT_ALREADY_CLOSED") {
      return jsonResponse(409, {
        success: false,
        code: "VALIDATION_ERROR",
        error: "This move-out is already closed and cannot be edited"
      });
    }

    console.error("Failed to save move-out inspection", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to save move-out inspection"
    });
  }
}
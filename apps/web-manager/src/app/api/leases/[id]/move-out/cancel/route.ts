import { Permission } from "@hhousing/api-contracts";
import { cancelLeaseMoveOut } from "../../../../../../api/leases/move-out";
import { requirePermission } from "../../../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../../../lib/operator-scope-portfolio";
import { createTeamFunctionsRepo, createTenantLeaseRepo, jsonResponse } from "../../../../shared";

export async function POST(
  _request: Request,
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

  const repository = createTenantLeaseRepo();
  const [lease, scopedPortfolio] = await Promise.all([
    repository.getLeaseById(id, access.data.organizationId),
    getScopedPortfolioData(access.data)
  ]);

  if (!lease || !scopedPortfolio.leaseIds.has(id)) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Lease not found" });
  }

  try {
    const data = await cancelLeaseMoveOut(
      lease,
      access.data.memberships.find((membership) => membership.organizationId === access.data.organizationId)?.id ?? null,
      repository
    );
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "MOVE_OUT_NOT_PLANNED") {
      return jsonResponse(409, {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Aucune fin de location planifiée à annuler."
      });
    }
    console.error("Failed to cancel move-out", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Impossible d'annuler la fin de location"
    });
  }
}

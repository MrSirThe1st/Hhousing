import {
  Permission,
  type GetMoveOutReconciliationOutput
} from "@hhousing/api-contracts";
import {
  buildMoveOutReconciliation
} from "../../../../../../api/leases/move-out";
import { requirePermission } from "../../../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../../../lib/operator-scope-portfolio";
import {
  createPaymentRepo,
  createTeamFunctionsRepo,
  createTenantLeaseRepo,
  jsonResponse
} from "../../../../shared";

export async function GET(
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
    Permission.VIEW_LEASE,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
  }

  const repository = createTenantLeaseRepo();
  const paymentRepository = createPaymentRepo();
  const [lease, scopedPortfolio] = await Promise.all([
    repository.getLeaseById(id, access.data.organizationId),
    getScopedPortfolioData(access.data)
  ]);

  if (!lease || !scopedPortfolio.leaseIds.has(id)) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Lease not found" });
  }

  const data: GetMoveOutReconciliationOutput = await buildMoveOutReconciliation(
    lease,
    repository,
    paymentRepository
  );

  return jsonResponse(200, { success: true, data });
}

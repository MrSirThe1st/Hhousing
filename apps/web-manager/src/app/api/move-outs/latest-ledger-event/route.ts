import { Permission } from "@hhousing/api-contracts";
import { requirePermission } from "../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createTeamFunctionsRepo, createTenantLeaseRepo, jsonResponse } from "../../shared";

export type GetLatestLedgerEventOutput = { ledgerEventId: number | null };

export async function GET(): Promise<Response> {
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
  const ledgerEventId = await repository.getLatestLedgerEventId(access.data.organizationId);
  const data: GetLatestLedgerEventOutput = { ledgerEventId };

  return jsonResponse(200, { success: true, data });
}

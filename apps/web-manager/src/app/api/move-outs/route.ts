import { Permission } from "@hhousing/api-contracts";
import type { MoveOutListItem } from "@hhousing/data-access";
import { requirePermission } from "../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { createTeamFunctionsRepo, createTenantLeaseRepo, jsonResponse } from "../shared";

export type GetMoveOutsOutput = MoveOutListItem[];

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
  const data: GetMoveOutsOutput = await repository.listMoveOutsByOrganization(access.data.organizationId);

  return jsonResponse(200, { success: true, data });
}

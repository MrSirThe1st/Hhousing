import type {
  ApiResult,
  AuthSession,
  ListTenantsOutput
} from "@hhousing/api-contracts";
import { Permission } from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import { requirePermission, type TeamPermissionRepository } from "../organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

export interface ListTenantsRequest {
  organizationId: string | null;
  session: AuthSession | null;
}

export interface ListTenantsResponse {
  status: number;
  body: ApiResult<ListTenantsOutput>;
}

export interface ListTenantsDeps {
  repository: TenantLeaseRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function listTenants(
  request: ListTenantsRequest,
  deps: ListTenantsDeps
): Promise<ListTenantsResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const organizationId = request.organizationId ?? sessionResult.data.organizationId ?? "";

  if (organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.VIEW_TENANTS,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: mapErrorCodeToHttpStatus(permissionResult.code), body: permissionResult };
  }

  const tenants = await deps.repository.listTenantsByOrganization(organizationId);

  return { status: 200, body: { success: true, data: { tenants } } };
}

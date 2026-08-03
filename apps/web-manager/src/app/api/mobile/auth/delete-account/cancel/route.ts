import { extractTenantSessionFromRequest } from "../../../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../../../api/shared";
import { cancelTenantAccountDeletion } from "../../../../../../api/tenants/tenant-delete-account";
import { createAuthRepo, createTenantLeaseRepo, jsonResponse } from "../../../../shared";

export async function OPTIONS(): Promise<Response> {
  return jsonResponse(204, null, new Request("http://localhost"));
}

export async function POST(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request, {
    allowPendingDeletion: true
  });
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access, request);
  }

  const result = await cancelTenantAccountDeletion({
    tenantRepository: createTenantLeaseRepo(),
    authRepository: createAuthRepo(),
    userId: access.data.userId,
    organizationId: access.data.organizationId
  });

  return jsonResponse(result.status, result.body, request);
}

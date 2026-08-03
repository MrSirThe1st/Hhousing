import { extractTenantSessionFromRequest } from "../../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../../api/shared";
import {
  cancelTenantAccountDeletion,
  getTenantAccountDeletionStatus,
  requestTenantAccountDeletion
} from "../../../../../api/tenants/tenant-delete-account";
import { createAccountDeletionNotifierFromEnv } from "../../../../../lib/notifications/account-deletion-notifiers";
import { createAuthRepo, createTenantLeaseRepo, jsonResponse } from "../../../shared";

export async function OPTIONS(): Promise<Response> {
  return jsonResponse(204, null, new Request("http://localhost"));
}

export async function GET(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request, {
    allowPendingDeletion: true
  });
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access, request);
  }

  const result = await getTenantAccountDeletionStatus({
    tenantRepository: createTenantLeaseRepo(),
    userId: access.data.userId,
    organizationId: access.data.organizationId
  });

  return jsonResponse(result.status, result.body, request);
}

export async function POST(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access, request);
  }

  let notify;
  try {
    notify = createAccountDeletionNotifierFromEnv();
  } catch {
    notify = undefined;
  }

  const result = await requestTenantAccountDeletion({
    tenantRepository: createTenantLeaseRepo(),
    authRepository: createAuthRepo(),
    userId: access.data.userId,
    organizationId: access.data.organizationId,
    notify
  });

  return jsonResponse(result.status, result.body, request);
}

import type {
  ApiResult,
  AuthSession,
  CreateTenantOutput
} from "@hhousing/api-contracts";
import { Permission, parseCreateTenantInput } from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import { requirePermission, type TeamPermissionRepository } from "../organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";
import { logOperatorAuditEvent } from "../audit-log";

export interface CreateTenantRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateTenantResponse {
  status: number;
  body: ApiResult<CreateTenantOutput>;
}

export interface CreateTenantDeps {
  repository: TenantLeaseRepository;
  teamFunctionsRepository: TeamPermissionRepository;
  createId: () => string;
}

export async function createTenant(
  request: CreateTenantRequest,
  deps: CreateTenantDeps
): Promise<CreateTenantResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.MANAGE_TENANTS,
    deps.teamFunctionsRepository,
    true
  );
  if (!permissionResult.success) {
    return { status: mapErrorCodeToHttpStatus(permissionResult.code), body: permissionResult };
  }

  const parsed = parseCreateTenantInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const tenant = await deps.repository.createTenant({
    id: deps.createId(),
    organizationId: parsed.data.organizationId,
    authUserId: null,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    dateOfBirth: parsed.data.dateOfBirth ?? null,
    photoUrl: parsed.data.photoUrl ?? null,
    employmentStatus: parsed.data.employmentStatus ?? null,
    jobTitle: parsed.data.jobTitle ?? null,
    monthlyIncome: parsed.data.monthlyIncome ?? null,
    numberOfOccupants: parsed.data.numberOfOccupants ?? null
  });

  await logOperatorAuditEvent({
    session: sessionResult.data,
    actionKey: "operations.tenant.created",
    entityType: "tenant",
    entityId: tenant.id,
    metadata: {
      email: tenant.email,
      phone: tenant.phone
    }
  });

  return { status: 201, body: { success: true, data: tenant } };
}

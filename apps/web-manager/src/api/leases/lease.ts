import type {
  ApiResult,
  AuthSession,
  CreateLeaseOutput,
  ListLeasesOutput
} from "@hhousing/api-contracts";
import { Permission, parseCreateLeaseInput } from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import { requirePermission, type TeamPermissionRepository } from "../organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

export interface CreateLeaseRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateLeaseResponse {
  status: number;
  body: ApiResult<CreateLeaseOutput>;
}

export interface CreateLeaseDeps {
  repository: TenantLeaseRepository;
  teamFunctionsRepository: TeamPermissionRepository;
  createId: () => string;
}

export async function createLease(
  request: CreateLeaseRequest,
  deps: CreateLeaseDeps
): Promise<CreateLeaseResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.CREATE_LEASE,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(permissionResult.code),
      body: permissionResult
    };
  }

  const parsed = parseCreateLeaseInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  try {
    const lease = await deps.repository.createLease({
      id: deps.createId(),
      organizationId: parsed.data.organizationId,
      unitId: parsed.data.unitId,
      tenantId: parsed.data.tenantId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      monthlyRentAmount: parsed.data.monthlyRentAmount,
      currencyCode: parsed.data.currencyCode
    });

    return { status: 201, body: { success: true, data: lease } };
  } catch (error) {
    if (error instanceof Error && error.message === "UNIT_NOT_AVAILABLE") {
      return {
        status: 400,
        body: {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Unit must exist and be vacant before creating a lease"
        }
      };
    }

    return {
      status: 500,
      body: {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to create lease"
      }
    };
  }
}

export interface ListLeasesRequest {
  organizationId: string | null;
  session: AuthSession | null;
}

export interface ListLeasesResponse {
  status: number;
  body: ApiResult<ListLeasesOutput>;
}

export interface ListLeasesDeps {
  repository: TenantLeaseRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function listLeases(
  request: ListLeasesRequest,
  deps: ListLeasesDeps
): Promise<ListLeasesResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.VIEW_LEASE,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(permissionResult.code),
      body: permissionResult
    };
  }

  const organizationId = request.organizationId ?? sessionResult.data.organizationId ?? "";

  if (organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const leases = await deps.repository.listLeasesByOrganization(organizationId);
  return { status: 200, body: { success: true, data: { leases } } };
}

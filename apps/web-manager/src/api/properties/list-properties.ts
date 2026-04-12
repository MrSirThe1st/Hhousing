import type {
  ApiResult,
  AuthSession,
  ListPropertiesFilter,
  ListPropertiesWithUnitsOutput
} from "@hhousing/api-contracts";
import { Permission } from "@hhousing/api-contracts";
import type { OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { requirePermission, type TeamPermissionRepository } from "../organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

export interface ListPropertiesRequest {
  session: AuthSession | null;
  organizationId: string;
  filter?: ListPropertiesFilter;
}

export interface ListPropertiesResponse {
  status: number;
  body: ApiResult<ListPropertiesWithUnitsOutput>;
}

export interface ListPropertiesDeps {
  repository: OrganizationPropertyUnitRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function listProperties(
  request: ListPropertiesRequest,
  deps: ListPropertiesDeps
): Promise<ListPropertiesResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(sessionResult.code),
      body: sessionResult
    };
  }

  if (request.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "Organization mismatch"
      }
    };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.VIEW_PROPERTIES,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(permissionResult.code),
      body: permissionResult
    };
  }

  const items = await deps.repository.listPropertiesWithUnits(
    request.organizationId,
    request.filter?.managementContext
      ? {
        ...request.filter,
        ownerType: request.filter.managementContext === "owned" ? "organization" : "client"
      }
      : request.filter
  );

  return {
    status: 200,
    body: {
      success: true,
      data: {
        items
      }
    }
  };
}

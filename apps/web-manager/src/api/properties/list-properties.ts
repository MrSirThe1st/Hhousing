import type {
  ApiResult,
  AuthSession,
  ListPropertiesFilter,
  ListPropertiesWithUnitsOutput
} from "@hhousing/api-contracts";
import type { OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { isScopeAllowedForSession } from "../../lib/operator-context";
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

  if (
    request.filter?.managementContext !== undefined &&
    !isScopeAllowedForSession(sessionResult.data, request.filter.managementContext)
  ) {
    return {
      status: 403,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "Management context not allowed for current operator"
      }
    };
  }

  const items = await deps.repository.listPropertiesWithUnits(
    request.organizationId,
    request.filter?.managementContext
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

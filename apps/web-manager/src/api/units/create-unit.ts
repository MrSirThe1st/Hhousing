import type {
  ApiResult,
  AuthSession,
  CreateUnitOutput
} from "@hhousing/api-contracts";
import { parseCreateUnitInput } from "@hhousing/api-contracts";
import type { OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

export interface CreateUnitRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateUnitResponse {
  status: number;
  body: ApiResult<CreateUnitOutput>;
}

export interface CreateUnitDeps {
  repository: OrganizationPropertyUnitRepository;
  createId: () => string;
}

export async function createUnit(
  request: CreateUnitRequest,
  deps: CreateUnitDeps
): Promise<CreateUnitResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(sessionResult.code),
      body: sessionResult
    };
  }

  const parsed = parseCreateUnitInput(request.body);
  if (!parsed.success) {
    return {
      status: mapErrorCodeToHttpStatus(parsed.code),
      body: parsed
    };
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "Organization mismatch"
      }
    };
  }

  const unit = await deps.repository.createUnit({
    id: deps.createId(),
    organizationId: parsed.data.organizationId,
    propertyId: parsed.data.propertyId,
    unitNumber: parsed.data.unitNumber,
    monthlyRentAmount: parsed.data.monthlyRentAmount,
    currencyCode: parsed.data.currencyCode
  });

  return {
    status: 201,
    body: {
      success: true,
      data: {
        unit
      }
    }
  };
}

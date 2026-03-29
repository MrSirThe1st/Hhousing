import type {
  ApiResult,
  AuthSession,
  CreatePropertyOutput
} from "@hhousing/api-contracts";
import { parseCreatePropertyInput } from "@hhousing/api-contracts";
import type { OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

export interface CreatePropertyRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreatePropertyResponse {
  status: number;
  body: ApiResult<CreatePropertyOutput>;
}

export interface CreatePropertyDeps {
  repository: OrganizationPropertyUnitRepository;
  createId: () => string;
}

export async function createProperty(
  request: CreatePropertyRequest,
  deps: CreatePropertyDeps
): Promise<CreatePropertyResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(sessionResult.code),
      body: sessionResult
    };
  }

  const parsed = parseCreatePropertyInput(request.body);
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

  const property = await deps.repository.createProperty({
    id: deps.createId(),
    organizationId: parsed.data.organizationId,
    name: parsed.data.name,
    address: parsed.data.address,
    city: parsed.data.city,
    countryCode: parsed.data.countryCode
  });

  return {
    status: 201,
    body: {
      success: true,
      data: {
        property
      }
    }
  };
}

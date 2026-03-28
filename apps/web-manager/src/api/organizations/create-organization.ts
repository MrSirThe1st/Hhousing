import type {
  ApiResult,
  AuthSession,
  CreateOrganizationOutput
} from "@hhousing/api-contracts";
import {
  parseCreateOrganizationInput
} from "@hhousing/api-contracts";
import type { OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireManagerSession } from "../shared";

export interface CreateOrganizationRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateOrganizationResponse {
  status: number;
  body: ApiResult<CreateOrganizationOutput>;
}

export interface CreateOrganizationDeps {
  repository: OrganizationPropertyUnitRepository;
  createId: () => string;
}

export async function createOrganization(
  request: CreateOrganizationRequest,
  deps: CreateOrganizationDeps
): Promise<CreateOrganizationResponse> {
  const sessionResult = requireManagerSession(request.session);
  if (!sessionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(sessionResult.code),
      body: sessionResult
    };
  }

  const parsed = parseCreateOrganizationInput(request.body);
  if (!parsed.success) {
    return {
      status: mapErrorCodeToHttpStatus(parsed.code),
      body: parsed
    };
  }

  const organization = await deps.repository.createOrganization({
    id: deps.createId(),
    name: parsed.data.name
  });

  return {
    status: 201,
    body: {
      success: true,
      data: {
        organization
      }
    }
  };
}

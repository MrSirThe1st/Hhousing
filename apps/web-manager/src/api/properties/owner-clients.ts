import type {
  ApiResult,
  AuthSession,
  CreateOwnerOutput,
  ListOwnersOutput
} from "@hhousing/api-contracts";
import { parseCreateOwnerInput } from "@hhousing/api-contracts";
import type { OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

export interface CreateOwnerRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateOwnerResponse {
  status: number;
  body: ApiResult<CreateOwnerOutput>;
}

export interface ListOwnersRequest {
  organizationId: string | null;
  session: AuthSession | null;
}

export interface ListOwnersResponse {
  status: number;
  body: ApiResult<ListOwnersOutput>;
}

export interface OwnersDeps {
  repository: OrganizationPropertyUnitRepository;
  createId: () => string;
}

function getOwnerDisplayName(input: { fullName: string; isCompany: boolean; companyName?: string | null }): string {
  if (input.isCompany && input.companyName) {
    return input.companyName;
  }

  return input.fullName;
}

export async function createOwner(
  request: CreateOwnerRequest,
  deps: OwnersDeps
): Promise<CreateOwnerResponse> {
  const access = requireOperatorSession(request.session);
  if (!access.success) {
    return {
      status: mapErrorCodeToHttpStatus(access.code),
      body: access
    };
  }

  const parsed = parseCreateOwnerInput(request.body);
  if (!parsed.success) {
    return {
      status: mapErrorCodeToHttpStatus(parsed.code),
      body: parsed
    };
  }

  if (parsed.data.organizationId !== access.data.organizationId) {
    return {
      status: 403,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "Organization mismatch"
      }
    };
  }

  const owner = await deps.repository.createOwner({
    id: deps.createId(),
    organizationId: parsed.data.organizationId,
    name: getOwnerDisplayName(parsed.data),
    fullName: parsed.data.fullName,
    ownerType: "client",
    userId: null,
    address: parsed.data.address ?? null,
    isCompany: parsed.data.isCompany,
    companyName: parsed.data.companyName ?? null,
    country: parsed.data.country ?? null,
    city: parsed.data.city ?? null,
    state: parsed.data.state ?? null,
    phoneNumber: parsed.data.phoneNumber ?? null,
    profilePictureUrl: parsed.data.profilePictureUrl ?? null
  });

  return {
    status: 201,
    body: {
      success: true,
      data: {
        owner
      }
    }
  };
}

export async function listOwners(
  request: ListOwnersRequest,
  deps: Pick<OwnersDeps, "repository">
): Promise<ListOwnersResponse> {
  const access = requireOperatorSession(request.session);
  if (!access.success) {
    return {
      status: mapErrorCodeToHttpStatus(access.code),
      body: access
    };
  }

  const organizationId = request.organizationId ?? access.data.organizationId;
  if (organizationId !== access.data.organizationId) {
    return {
      status: 403,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "Organization mismatch"
      }
    };
  }

  const owners = await deps.repository.listOwners(organizationId);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        owners
      }
    }
  };
}
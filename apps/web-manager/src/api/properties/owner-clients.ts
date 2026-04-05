import type {
  ApiResult,
  AuthSession,
  CreateOwnerClientOutput,
  ListOwnerClientsOutput
} from "@hhousing/api-contracts";
import { parseCreateOwnerClientInput } from "@hhousing/api-contracts";
import type { OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

export interface CreateOwnerClientRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateOwnerClientResponse {
  status: number;
  body: ApiResult<CreateOwnerClientOutput>;
}

export interface ListOwnerClientsRequest {
  organizationId: string | null;
  session: AuthSession | null;
}

export interface ListOwnerClientsResponse {
  status: number;
  body: ApiResult<ListOwnerClientsOutput>;
}

export interface OwnerClientsDeps {
  repository: OrganizationPropertyUnitRepository;
  createId: () => string;
}

export async function createOwnerClient(
  request: CreateOwnerClientRequest,
  deps: OwnerClientsDeps
): Promise<CreateOwnerClientResponse> {
  const access = requireOperatorSession(request.session);
  if (!access.success) {
    return {
      status: mapErrorCodeToHttpStatus(access.code),
      body: access
    };
  }

  const parsed = parseCreateOwnerClientInput(request.body);
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

  const client = await deps.repository.createOwnerClient({
    id: deps.createId(),
    organizationId: parsed.data.organizationId,
    name: parsed.data.name
  });

  return {
    status: 201,
    body: {
      success: true,
      data: {
        client
      }
    }
  };
}

export async function listOwnerClients(
  request: ListOwnerClientsRequest,
  deps: Pick<OwnerClientsDeps, "repository">
): Promise<ListOwnerClientsResponse> {
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

  const clients = await deps.repository.listOwnerClients(organizationId);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        clients
      }
    }
  };
}
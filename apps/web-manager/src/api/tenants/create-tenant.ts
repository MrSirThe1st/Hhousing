import type {
  ApiResult,
  AuthSession,
  CreateTenantOutput
} from "@hhousing/api-contracts";
import { parseCreateTenantInput } from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireManagerSession } from "../shared";

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
  createId: () => string;
}

export async function createTenant(
  request: CreateTenantRequest,
  deps: CreateTenantDeps
): Promise<CreateTenantResponse> {
  const sessionResult = requireManagerSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
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
    phone: parsed.data.phone
  });

  return { status: 201, body: { success: true, data: tenant } };
}

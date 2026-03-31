import {
  TeamFunctionCode,
  parseInvitePropertyManagerInput
} from "@hhousing/api-contracts";
import type {
  ApiResult,
  AuthSession,
  InvitePropertyManagerOutput,
  ListOrganizationMembersOutput
} from "@hhousing/api-contracts";
import type { AuthRepository } from "@hhousing/data-access";
import { TeamFunctionsRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

function isMissingTeamFunctionsSchema(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeCode = (error as Error & { code?: string }).code;
  return maybeCode === "42P01";
}

function requireOperator(session: AuthSession): ApiResult<AuthSession> {
  if (session.role !== "landlord" && session.role !== "property_manager") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Only operators can invite team members"
    };
  }

  return { success: true, data: session };
}

/**
 * Validate function assignment escalation
 * - LEASING_AGENT, ACCOUNTANT, MAINTENANCE_MANAGER: anyone can assign
 * - ADMIN: only landlord can assign
 */
function validateFunctionEscalation(
  inviterRole: "landlord" | "property_manager",
  functionCode: TeamFunctionCode
): ApiResult<void> {
  const adminOnlyFunctions: TeamFunctionCode[] = [TeamFunctionCode.ADMIN];

  if (adminOnlyFunctions.includes(functionCode) && inviterRole !== "landlord") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: `Only landlords can assign the ${functionCode} function`
    };
  }

  return { success: true, data: undefined };
}

export interface ListOrganizationMembersRequest {
  session: AuthSession | null;
  organizationId: string | null;
}

export interface ListOrganizationMembersResponse {
  status: number;
  body: ApiResult<ListOrganizationMembersOutput>;
}

export interface ListOrganizationMembersDeps {
  repository: AuthRepository;
}

export async function listOrganizationMembers(
  request: ListOrganizationMembersRequest,
  deps: ListOrganizationMembersDeps
): Promise<ListOrganizationMembersResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const organizationId = request.organizationId ?? sessionResult.data.organizationId;
  if (organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const memberships = await deps.repository.listMembershipsByOrganization(organizationId);
  return { status: 200, body: { success: true, data: { memberships } } };
}

export interface InvitePropertyManagerRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface InvitePropertyManagerResponse {
  status: number;
  body: ApiResult<InvitePropertyManagerOutput>;
}

export interface InvitePropertyManagerDeps {
  repository: AuthRepository;
  teamFunctionsRepository: TeamFunctionsRepository;
  createId: () => string;
}

export async function invitePropertyManager(
  request: InvitePropertyManagerRequest,
  deps: InvitePropertyManagerDeps
): Promise<InvitePropertyManagerResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const operatorResult = requireOperator(sessionResult.data);
  if (!operatorResult.success) {
    return { status: mapErrorCodeToHttpStatus(operatorResult.code), body: operatorResult };
  }

  const parsed = parseInvitePropertyManagerInput(
    request.body,
    sessionResult.data.organizationId
  );
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const existing = await deps.repository.getMembershipByUserAndOrg(
    parsed.data.userId,
    parsed.data.organizationId
  );
  if (existing) {
    return {
      status: 409,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "This user is already a member of this organization"
      }
    };
  }

  // Validate role-based escalation (property_manager cannot create landlord members)
  if (sessionResult.data.role === "property_manager" && parsed.data.role === "landlord") {
    return {
      status: 403,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "Property managers cannot invite landlords"
      }
    };
  }

  if (parsed.data.role === "property_manager" && (!parsed.data.functions || parsed.data.functions.length === 0)) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Select at least one function for a property manager"
      }
    };
  }

  if (parsed.data.role === "landlord" && parsed.data.functions && parsed.data.functions.length > 0) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Landlords already have full org access and should not receive functions"
      }
    };
  }

  let organizationFunctions = [] as Awaited<
    ReturnType<InvitePropertyManagerDeps["teamFunctionsRepository"]["listFunctionsByOrganization"]>
  >;

  try {
    organizationFunctions = await deps.teamFunctionsRepository.listFunctionsByOrganization(
      parsed.data.organizationId
    );
  } catch (error) {
    if (!isMissingTeamFunctionsSchema(error)) {
      throw error;
    }

    return {
      status: 503,
      body: {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Team permissions schema is missing. Apply migrations 0009 and 0010."
      }
    };
  }
  const functionsByCode = new Map(
    organizationFunctions.map((teamFunction) => [teamFunction.functionCode, teamFunction])
  );

  // Validate function-based escalation (property_manager cannot assign ADMIN)
  if (parsed.data.functions) {
    for (const functionCode of parsed.data.functions) {
      if (!functionsByCode.has(functionCode)) {
        return {
          status: 400,
          body: {
            success: false,
            code: "VALIDATION_ERROR",
            error: `Unknown function for this organization: ${functionCode}`
          }
        };
      }

      const escalationCheck = validateFunctionEscalation(
        sessionResult.data.role as "landlord" | "property_manager",
        functionCode
      );
      if (!escalationCheck.success) {
        return {
          status: mapErrorCodeToHttpStatus(escalationCheck.code),
          body: escalationCheck
        };
      }
    }
  }

  const membership = await deps.repository.createOrganizationMembership({
    id: deps.createId(),
    organizationId: parsed.data.organizationId,
    userId: parsed.data.userId,
    role: parsed.data.role,
    status: "active",
    canOwnProperties: parsed.data.canOwnProperties
  });

  if (parsed.data.functions) {
    for (const functionCode of parsed.data.functions) {
      const functionDefinition = functionsByCode.get(functionCode);
      if (!functionDefinition) {
        continue;
      }

      await deps.teamFunctionsRepository.assignFunctionToMember(
        membership.id,
        functionDefinition.id,
        parsed.data.organizationId,
        sessionResult.data.userId
      );
    }
  }

  return { status: 201, body: { success: true, data: membership } };
}

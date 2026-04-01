import {
  TeamFunctionCode,
  parseInvitePropertyManagerInput
} from "@hhousing/api-contracts";
import type {
  ApiResult,
  AuthSession,
  InvitePropertyManagerOutput,
  ListOrganizationMembersOutput,
  TeamFunction
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

export interface UpdateMemberFunctionsRequest {
  memberId: string;
  body: unknown;
  session: AuthSession | null;
}

export interface UpdateMemberFunctionsResponse {
  status: number;
  body: ApiResult<{ functions: TeamFunction[] }>;
}

export interface UpdateMemberFunctionsDeps {
  repository: AuthRepository;
  teamFunctionsRepository: TeamFunctionsRepository;
}

export async function updateMemberFunctions(
  request: UpdateMemberFunctionsRequest,
  deps: UpdateMemberFunctionsDeps
): Promise<UpdateMemberFunctionsResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const operatorResult = requireOperator(sessionResult.data);
  if (!operatorResult.success) {
    return { status: mapErrorCodeToHttpStatus(operatorResult.code), body: operatorResult };
  }

  // Parse the incoming function codes
  if (!Array.isArray((request.body as Record<string, unknown>)?.functions)) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "functions must be an array" }
    };
  }

  const rawFunctions = (request.body as { functions: unknown[] }).functions;
  const validCodes = Object.values(TeamFunctionCode) as string[];
  const newFunctionCodes: TeamFunctionCode[] = [];

  for (const item of rawFunctions) {
    if (typeof item !== "string" || !validCodes.includes(item)) {
      return {
        status: 400,
        body: { success: false, code: "VALIDATION_ERROR", error: `Invalid function code: ${String(item)}` }
      };
    }
    newFunctionCodes.push(item as TeamFunctionCode);
  }

  // Verify the target membership exists and belongs to the same org
  const membership = await deps.repository.getMembershipById(request.memberId);
  if (!membership || membership.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Member not found" }
    };
  }

  // Landlords cannot have functions
  if (membership.role === "landlord") {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Landlords cannot have functions" }
    };
  }

  // property_manager must keep at least one function
  if (newFunctionCodes.length === 0) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Select at least one function for a property manager" }
    };
  }

  // Validate escalation: property_manager cannot assign ADMIN
  for (const functionCode of newFunctionCodes) {
    const escalationCheck = validateFunctionEscalation(
      sessionResult.data.role as "landlord" | "property_manager",
      functionCode
    );
    if (!escalationCheck.success) {
      return { status: mapErrorCodeToHttpStatus(escalationCheck.code), body: escalationCheck };
    }
  }

  let organizationFunctions: Awaited<
    ReturnType<UpdateMemberFunctionsDeps["teamFunctionsRepository"]["listFunctionsByOrganization"]>
  >;

  try {
    organizationFunctions = await deps.teamFunctionsRepository.listFunctionsByOrganization(
      sessionResult.data.organizationId
    );
  } catch (error) {
    if (!isMissingTeamFunctionsSchema(error)) {
      throw error;
    }
    return {
      status: 503,
      body: { success: false, code: "INTERNAL_ERROR", error: "Team permissions schema is missing. Apply migrations 0009 and 0010." }
    };
  }

  const functionsByCode = new Map(
    organizationFunctions.map((teamFunction) => [teamFunction.functionCode, teamFunction])
  );

  for (const functionCode of newFunctionCodes) {
    if (!functionsByCode.has(functionCode)) {
      return {
        status: 400,
        body: { success: false, code: "VALIDATION_ERROR", error: `Unknown function for this organization: ${functionCode}` }
      };
    }
  }

  // Replace: clear all current functions then assign the new set
  await deps.teamFunctionsRepository.clearMemberFunctions(request.memberId);

  const assignedFunctions: TeamFunction[] = [];
  for (const functionCode of newFunctionCodes) {
    const functionDefinition = functionsByCode.get(functionCode);
    if (!functionDefinition) continue;
    await deps.teamFunctionsRepository.assignFunctionToMember(
      request.memberId,
      functionDefinition.id,
      sessionResult.data.organizationId,
      sessionResult.data.userId
    );
    assignedFunctions.push(functionDefinition);
  }

  return { status: 200, body: { success: true, data: { functions: assignedFunctions } } };
}

export interface LookupUserByEmailRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface LookupUserByEmailResponse {
  status: number;
  body: ApiResult<{ userId: string; email: string }>;
}

export interface LookupUserByEmailDeps {
  supabaseAdminUrl: string;
  supabaseServiceRoleKey: string;
}

export async function lookupUserByEmail(
  request: LookupUserByEmailRequest,
  deps: LookupUserByEmailDeps
): Promise<LookupUserByEmailResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const { parseLookupUserByEmailInput } = await import("@hhousing/api-contracts");
  const parsed = parseLookupUserByEmailInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  try {
    // Call Supabase Admin API to lookup user by email
    const adminUrl = deps.supabaseAdminUrl;
    const serviceRoleKey = deps.supabaseServiceRoleKey;

    const response = await fetch(`${adminUrl}/auth/v1/admin/users`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json"
      }
    });

    if (!response.ok) {
      return {
        status: 500,
        body: {
          success: false,
          code: "INTERNAL_ERROR",
          error: "Failed to query user directory"
        }
      };
    }

    const data = (await response.json()) as { users?: Array<{ id: string; email: string }> };
    const users = data.users ?? [];

    const matchingUser = users.find(
      (u) => u.email && u.email.toLowerCase() === parsed.data.email.toLowerCase()
    );

    if (!matchingUser) {
      return {
        status: 404,
        body: {
          success: false,
          code: "NOT_FOUND",
          error: `No user found with email: ${parsed.data.email}`
        }
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        data: {
          userId: matchingUser.id,
          email: matchingUser.email
        }
      }
    };
  } catch (error) {
    console.error("Lookup user by email error:", error);
    return {
      status: 500,
      body: {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to lookup user"
      }
    };
  }
}

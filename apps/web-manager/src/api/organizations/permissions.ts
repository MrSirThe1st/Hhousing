/**
 * Permission authorization helper
 * Ensures user has required permission via their assigned functions
 */

import { type ApiResult, type AuthSession, Permission } from "@hhousing/api-contracts";
import type { TeamFunction } from "@hhousing/api-contracts";

export interface TeamPermissionRepository {
  listMemberFunctions(memberId: string): Promise<TeamFunction[]>;
}

function isMissingTeamFunctionsSchema(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeCode = (error as Error & { code?: string }).code;
  return maybeCode === "42P01";
}

/**
 * Verify user has required permission
 * Operators (landlord/property_manager) can have functions, which grant permissions
 * Tenants cannot have functions
 */
export async function requirePermission(
  session: AuthSession,
  permission: Permission,
  teamFunctionsRepo: TeamPermissionRepository
): Promise<ApiResult<AuthSession>> {
  // Landlords keep full org access by role.
  if (session.role === "landlord") {
    return {
      success: true,
      data: session
    };
  }

  // Only operator roles can use function-based permissions.
  if (session.role !== "property_manager") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Role is not eligible for operator permissions"
    };
  }

  const membership = session.memberships.find(
    (item) => item.organizationId === session.organizationId
  );

  // Backward compatibility: existing managers without membership context keep access.
  if (!membership) {
    return {
      success: true,
      data: session
    };
  }

  let functions: TeamFunction[] = [];
  try {
    functions = await teamFunctionsRepo.listMemberFunctions(membership.id);
  } catch (error) {
    if (!isMissingTeamFunctionsSchema(error)) {
      throw error;
    }

    // Backward compatibility during migration rollout.
    return {
      success: true,
      data: session
    };
  }

  // Backward compatibility: existing managers with zero assigned functions keep access.
  if (functions.length === 0) {
    return {
      success: true,
      data: session
    };
  }

  const hasPermission = functions.some((teamFunction) =>
    functionHasPermission(teamFunction.permissions, permission)
  );

  if (!hasPermission) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: `Missing permission: ${permission}`
    };
  }

  return {
    success: true,
    data: session
  };
}

/**
 * Check if any function in a list has a specific permission
 */
export function functionHasPermission(
  permissions: string[],
  requiredPermission: Permission
): boolean {
  if (permissions.includes("*")) {
    return true;
  }

  return permissions.includes(requiredPermission);
}

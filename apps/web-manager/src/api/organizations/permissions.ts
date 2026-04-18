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
 * Verify user has required permission.
 * Pass writeOnly = true to enforce the permission check (mutations).
 * By default (writeOnly = false) any authenticated operator can read — no permission required.
 */
export async function requirePermission(
  session: AuthSession,
  permission: Permission,
  teamFunctionsRepo: TeamPermissionRepository,
  writeOnly: boolean = false
): Promise<ApiResult<AuthSession>> {
  // Only operator roles are eligible.
  if (session.role !== "property_manager" && session.role !== "landlord") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Role is not eligible for operator permissions"
    };
  }

  // Read operations: always allow any authenticated operator.
  if (!writeOnly) {
    return { success: true, data: session };
  }

  const membership = session.memberships.find(
    (item) => item.organizationId === session.organizationId
  );

  // Backward compatibility: existing managers without membership context keep write access.
  if (!membership) {
    return { success: true, data: session };
  }

  let functions: TeamFunction[] = [];
  try {
    functions = await teamFunctionsRepo.listMemberFunctions(membership.id);
  } catch (error) {
    if (!isMissingTeamFunctionsSchema(error)) {
      throw error;
    }
    return { success: true, data: session };
  }

  // Backward compatibility: members with zero assigned functions keep write access.
  if (functions.length === 0) {
    return { success: true, data: session };
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

  return { success: true, data: session };
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

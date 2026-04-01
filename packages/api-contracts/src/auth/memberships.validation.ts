import type { ApiResult } from "../api-result.types";
import type { InvitePropertyManagerInput, TeamInviteRole } from "./memberships.types";
import { TeamFunctionCode } from "../permissions.types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asTeamInviteRole(value: unknown): TeamInviteRole | null {
  if (value === undefined || value === null) {
    return "property_manager";
  }

  if (value === "property_manager" || value === "landlord") {
    return value;
  }

  return null;
}

function asTeamFunctionCode(value: unknown): TeamFunctionCode | null {
  const validCodes = Object.values(TeamFunctionCode);
  if (typeof value === "string" && validCodes.includes(value as TeamFunctionCode)) {
    return value as TeamFunctionCode;
  }
  return null;
}

function asTeamFunctionCodes(value: unknown): TeamFunctionCode[] | null {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const codes: TeamFunctionCode[] = [];
  for (const item of value) {
    const code = asTeamFunctionCode(item);
    if (code === null) {
      return null; // Invalid code in array
    }
    codes.push(code);
  }

  return codes;
}

export function parseInvitePropertyManagerInput(
  input: unknown,
  sessionOrganizationId: string
): ApiResult<InvitePropertyManagerInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const userId = asNonEmptyText(input.userId);
  if (userId === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "userId is required" };
  }

  const role = asTeamInviteRole(input.role);
  if (role === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "role must be one of: property_manager, landlord"
    };
  }

  const functions = asTeamFunctionCodes(input.functions);
  if (functions === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "functions must be an array of valid function codes"
    };
  }

  return {
    success: true,
    data: {
      organizationId: sessionOrganizationId,
      userId,
      role,
      canOwnProperties: asBoolean(input.canOwnProperties, false),
      functions: functions.length > 0 ? functions : undefined
    }
  };
}

export function parseLookupUserByEmailInput(
  input: unknown
): ApiResult<{ email: string }> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const email = asNonEmptyText(input.email);
  if (email === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "email is required" };
  }

  // Basic email validation
  if (!email.includes("@") || email.length < 5) {
    return { success: false, code: "VALIDATION_ERROR", error: "email is not valid" };
  }

  return {
    success: true,
    data: { email }
  };
}

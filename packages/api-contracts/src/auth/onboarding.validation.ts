import type { ApiResult } from "../api-result.types";
import type { CreateOperatorAccountInput, OperatorAccountType } from "./onboarding.types";

const VALID_ACCOUNT_TYPES: readonly OperatorAccountType[] = [
  "self_managed_owner",
  "manager_for_others",
  "mixed_operator",
  "tenant"
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asAccountType(value: unknown): OperatorAccountType | null {
  if (typeof value !== "string") {
    return null;
  }

  return VALID_ACCOUNT_TYPES.includes(value as OperatorAccountType)
    ? (value as OperatorAccountType)
    : null;
}

export function parseCreateOperatorAccountInput(input: unknown): ApiResult<CreateOperatorAccountInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationName = asNonEmptyText(input.organizationName);
  const accountType = asAccountType(input.accountType);

  if (organizationName === null || accountType === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationName and accountType are required"
    };
  }

  return {
    success: true,
    data: {
      organizationName,
      accountType
    }
  };
}
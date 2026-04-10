import type { ApiResult } from "../api-result.types";
import type {
  AcceptOwnerInvitationInput,
  CreateOwnerInvitationInput
} from "./owner-invitations.types";

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

export function parseCreateOwnerInvitationInput(
  input: unknown,
  sessionOrganizationId: string,
  ownerId: string
): ApiResult<CreateOwnerInvitationInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const email = asNonEmptyText(input.email);
  if (email === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "email is required" };
  }

  if (!email.includes("@") || email.length < 5) {
    return { success: false, code: "VALIDATION_ERROR", error: "email is not valid" };
  }

  return {
    success: true,
    data: {
      organizationId: sessionOrganizationId,
      ownerId,
      email: email.toLowerCase()
    }
  };
}

export function parseAcceptOwnerInvitationInput(input: unknown): ApiResult<AcceptOwnerInvitationInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const token = asNonEmptyText(input.token);
  if (token === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "token is required" };
  }

  const fullNameValue = input.fullName === undefined ? undefined : asNonEmptyText(input.fullName);
  const passwordValue = input.password === undefined ? undefined : asNonEmptyText(input.password);

  if (input.fullName !== undefined && fullNameValue === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "fullName is required when creating a new account"
    };
  }

  if (input.password !== undefined && passwordValue === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "password is required when creating a new account"
    };
  }

  const fullName = fullNameValue ?? undefined;
  const password = passwordValue ?? undefined;

  if ((fullName === undefined) !== (password === undefined)) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "fullName and password are both required when creating a new account"
    };
  }

  if (password !== undefined && password.length < 8) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "password must contain at least 8 characters"
    };
  }

  return {
    success: true,
    data: {
      token,
      fullName,
      password
    }
  };
}

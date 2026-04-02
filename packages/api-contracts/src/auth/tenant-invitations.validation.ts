import type { ApiResult } from "../api-result.types";
import type { AcceptTenantInvitationInput } from "./tenant-invitations.types";

function asNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseAcceptTenantInvitationInput(
  input: unknown
): ApiResult<AcceptTenantInvitationInput> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be an object"
    };
  }

  const payload = input as Record<string, unknown>;
  const token = asNonEmptyText(payload.token);
  if (token === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "token is required"
    };
  }

  const password = asNonEmptyText(payload.password);
  if (password === null || password.length < 8) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "password must be at least 8 characters"
    };
  }

  const rawPhone = payload.phone;
  const phone = rawPhone === null || rawPhone === undefined ? null : asNonEmptyText(rawPhone);

  return {
    success: true,
    data: {
      token,
      password,
      phone
    }
  };
}
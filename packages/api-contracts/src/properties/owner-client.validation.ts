import type { ApiResult } from "../api-result.types";
import type { CreateOwnerInput } from "./owner-client.types";

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

function asOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseCreateOwnerInput(input: unknown): ApiResult<CreateOwnerInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const fullName = asNonEmptyText(input.fullName);
  const address = asOptionalText(input.address);
  const country = asOptionalText(input.country);
  const city = asOptionalText(input.city);
  const state = asOptionalText(input.state);
  const phoneNumber = asOptionalText(input.phoneNumber);
  const companyName = asOptionalText(input.companyName);
  const profilePictureUrl = asOptionalText(input.profilePictureUrl);
  const isCompany = typeof input.isCompany === "boolean" ? input.isCompany : null;

  if (organizationId === null || fullName === null || isCompany === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationId, fullName and isCompany are required"
    };
  }

  if (isCompany && companyName !== undefined && companyName === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "companyName is required when isCompany is true"
    };
  }

  if (isCompany && (companyName === undefined || companyName === null)) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "companyName is required when isCompany is true"
    };
  }

  if (profilePictureUrl !== undefined && profilePictureUrl !== null) {
    try {
      new URL(profilePictureUrl);
    } catch {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "profilePictureUrl must be a valid URL"
      };
    }
  }

  return {
    success: true,
    data: {
      organizationId,
      fullName,
      address: address ?? null,
      isCompany,
      companyName: companyName ?? null,
      country: country ?? null,
      city: city ?? null,
      state: state ?? null,
      phoneNumber: phoneNumber ?? null,
      profilePictureUrl: profilePictureUrl ?? null
    }
  };
}
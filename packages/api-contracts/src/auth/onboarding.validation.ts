import type { PlatformExperience } from "@hhousing/domain";
import type { ApiResult } from "../api-result.types";
import type { CreateOperatorAccountInput, UpdatePlatformExperienceInput } from "./onboarding.types";

const VALID_PLATFORM_EXPERIENCES: readonly PlatformExperience[] = ["entreprise", "individual"];

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

function asPlatformExperience(value: unknown): PlatformExperience | null {
  if (typeof value !== "string") {
    return null;
  }

  return VALID_PLATFORM_EXPERIENCES.includes(value as PlatformExperience)
    ? (value as PlatformExperience)
    : null;
}

export function parseCreateOperatorAccountInput(input: unknown): ApiResult<CreateOperatorAccountInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationName = asNonEmptyText(input.organizationName);
  const platformExperience = asPlatformExperience(input.platformExperience);

  if (organizationName === null || platformExperience === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationName and platformExperience are required"
    };
  }

  return {
    success: true,
    data: {
      organizationName,
      platformExperience
    }
  };
}

export function parseUpdatePlatformExperienceInput(input: unknown): ApiResult<UpdatePlatformExperienceInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const platformExperience = asPlatformExperience(input.platformExperience);
  if (platformExperience === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "platformExperience is required"
    };
  }

  return {
    success: true,
    data: {
      platformExperience
    }
  };
}

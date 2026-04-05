import type { ApiResult } from "../api-result.types";
import type { CreateOwnerClientInput } from "./owner-client.types";

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

export function parseCreateOwnerClientInput(input: unknown): ApiResult<CreateOwnerClientInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const name = asNonEmptyText(input.name);

  if (organizationId === null || name === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationId and name are required"
    };
  }

  return {
    success: true,
    data: {
      organizationId,
      name
    }
  };
}
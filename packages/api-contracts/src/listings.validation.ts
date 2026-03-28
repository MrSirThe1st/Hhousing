import type { CreateListingIntentInput, CreateListingIntentValidationResult } from "./listings.types.js";

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

function asPrice(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value <= 0) {
    return null;
  }

  return value;
}

function asPurpose(value: unknown): "rent" | "sale" | null {
  if (value === "rent" || value === "sale") {
    return value;
  }

  return null;
}

export function parseCreateListingIntentInput(input: unknown): CreateListingIntentValidationResult {
  if (!isObject(input)) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Request body must be an object"
    };
  }

  const title = asNonEmptyText(input.title);
  const purpose = asPurpose(input.purpose);
  const priceUsd = asPrice(input.priceUsd);
  const location = asNonEmptyText(input.location);

  if (title === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "title is required"
    };
  }

  if (purpose === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "purpose must be rent or sale"
    };
  }

  if (priceUsd === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "priceUsd must be a positive number"
    };
  }

  if (location === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "location is required"
    };
  }

  const parsed: CreateListingIntentInput = {
    title,
    purpose,
    priceUsd,
    location
  };

  return {
    success: true,
    data: parsed
  };
}

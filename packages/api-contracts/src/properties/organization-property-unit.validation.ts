import type { ApiResult } from "../api-result.types";
import type {
  CreateOrganizationInput,
  CreatePropertyInput,
  CreateUnitInput
} from "./organization-property-unit.types";

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

function asPositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

export function parseCreateOrganizationInput(input: unknown): ApiResult<CreateOrganizationInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const name = asNonEmptyText(input.name);
  if (name === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "name is required" };
  }

  return { success: true, data: { name } };
}

export function parseCreatePropertyInput(input: unknown): ApiResult<CreatePropertyInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const name = asNonEmptyText(input.name);
  const address = asNonEmptyText(input.address);
  const city = asNonEmptyText(input.city);
  const countryCode = asNonEmptyText(input.countryCode);

  if (organizationId === null || name === null || address === null || city === null || countryCode === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationId, name, address, city, countryCode are required"
    };
  }

  return {
    success: true,
    data: { organizationId, name, address, city, countryCode }
  };
}

export function parseCreateUnitInput(input: unknown): ApiResult<CreateUnitInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const propertyId = asNonEmptyText(input.propertyId);
  const unitNumber = asNonEmptyText(input.unitNumber);
  const monthlyRentAmount = asPositiveNumber(input.monthlyRentAmount);
  const currencyCode = asNonEmptyText(input.currencyCode);

  if (
    organizationId === null ||
    propertyId === null ||
    unitNumber === null ||
    monthlyRentAmount === null ||
    currencyCode === null
  ) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationId, propertyId, unitNumber, monthlyRentAmount, currencyCode are required"
    };
  }

  return {
    success: true,
    data: { organizationId, propertyId, unitNumber, monthlyRentAmount, currencyCode }
  };
}

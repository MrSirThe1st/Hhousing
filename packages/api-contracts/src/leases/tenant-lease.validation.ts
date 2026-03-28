import type { ApiResult } from "../api-result.types";
import type { CreateTenantInput, CreateLeaseInput } from "./tenant-lease.types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return asNonEmptyText(value);
}

function asPositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function asIsoDate(value: unknown): string | null {
  const text = asNonEmptyText(value);
  if (text === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

export function parseCreateTenantInput(input: unknown): ApiResult<CreateTenantInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const fullName = asNonEmptyText(input.fullName);

  if (organizationId === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "organizationId is required" };
  }

  if (fullName === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "fullName is required" };
  }

  return {
    success: true,
    data: {
      organizationId,
      fullName,
      email: asOptionalText(input.email),
      phone: asOptionalText(input.phone),
    }
  };
}

export function parseCreateLeaseInput(input: unknown): ApiResult<CreateLeaseInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const unitId = asNonEmptyText(input.unitId);
  const tenantId = asNonEmptyText(input.tenantId);
  const startDate = asIsoDate(input.startDate);
  const monthlyRentAmount = asPositiveNumber(input.monthlyRentAmount);
  const currencyCode = asNonEmptyText(input.currencyCode);

  if (organizationId === null || unitId === null || tenantId === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationId, unitId, tenantId are required"
    };
  }

  if (startDate === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "startDate must be YYYY-MM-DD" };
  }

  if (monthlyRentAmount === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "monthlyRentAmount must be a positive number" };
  }

  if (currencyCode === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "currencyCode is required" };
  }

  const endDateRaw = input.endDate;
  let endDate: string | null = null;
  if (endDateRaw !== null && endDateRaw !== undefined) {
    endDate = asIsoDate(endDateRaw);
    if (endDate === null) {
      return { success: false, code: "VALIDATION_ERROR", error: "endDate must be YYYY-MM-DD or null" };
    }
  }

  return {
    success: true,
    data: {
      organizationId,
      unitId,
      tenantId,
      startDate,
      endDate,
      monthlyRentAmount,
      currencyCode,
    }
  };
}

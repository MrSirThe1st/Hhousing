import type { ApiResult } from "../api-result.types";
import type { CreateLeaseChargeInput, CreateLeaseInput, CreateTenantInput, FinalizeLeaseInput } from "./tenant-lease.types";

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

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value;
}

function parseLeaseChargeInput(input: unknown): ApiResult<CreateLeaseChargeInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Each charge must be an object" };
  }

  const label = asNonEmptyText(input.label);
  const chargeType = input.chargeType === "deposit"
    || input.chargeType === "rent"
    || input.chargeType === "prorated_rent"
    || input.chargeType === "fee"
    || input.chargeType === "other"
    ? input.chargeType
    : null;
  const amount = asPositiveNumber(input.amount);
  const currencyCode = asNonEmptyText(input.currencyCode);
  const frequency = input.frequency === "one_time" || input.frequency === "monthly" || input.frequency === "quarterly" || input.frequency === "annually"
    ? input.frequency
    : null;
  const startDate = asIsoDate(input.startDate);

  if (label === null || chargeType === null || amount === null || currencyCode === null || frequency === null || startDate === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Each charge requires label, chargeType, amount, currencyCode, frequency, and startDate"
    };
  }

  const endDateRaw = input.endDate;
  let endDate: string | null = null;
  if (endDateRaw !== null && endDateRaw !== undefined) {
    endDate = asIsoDate(endDateRaw);
    if (endDate === null) {
      return { success: false, code: "VALIDATION_ERROR", error: "charge endDate must be YYYY-MM-DD or null" };
    }
  }

  return {
    success: true,
    data: {
      label,
      chargeType,
      amount,
      currencyCode,
      frequency,
      startDate,
      endDate
    }
  };
}

export function parseFinalizeLeaseInput(input: unknown): ApiResult<FinalizeLeaseInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const signedAt = asIsoDate(input.signedAt);
  const signingMethod = input.signingMethod === "physical"
    || input.signingMethod === "scanned"
    || input.signingMethod === "email_confirmation"
    ? input.signingMethod
    : null;

  if (organizationId === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "organizationId is required" };
  }

  if (signedAt === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "signedAt must be YYYY-MM-DD" };
  }

  if (signingMethod === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "signingMethod must be physical, scanned, or email_confirmation"
    };
  }

  return {
    success: true,
    data: {
      organizationId,
      signedAt,
      signingMethod
    }
  };
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
      dateOfBirth: input.dateOfBirth === null || input.dateOfBirth === undefined ? null : asIsoDate(input.dateOfBirth),
      photoUrl: asOptionalText(input.photoUrl),
      employmentStatus: asOptionalText(input.employmentStatus),
      jobTitle: asOptionalText(input.jobTitle),
      monthlyIncome: typeof input.monthlyIncome === "number" && Number.isFinite(input.monthlyIncome) ? input.monthlyIncome : null,
      numberOfOccupants: typeof input.numberOfOccupants === "number" && Number.isInteger(input.numberOfOccupants) && input.numberOfOccupants > 0 ? input.numberOfOccupants : null
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
  const termType = input.termType === undefined
    ? null
    : input.termType === "fixed" || input.termType === "month_to_month"
      ? input.termType
      : null;
  const fixedTermMonths = input.fixedTermMonths === undefined || input.fixedTermMonths === null
    ? null
    : asInteger(input.fixedTermMonths);
  const autoRenewToMonthly = input.autoRenewToMonthly === undefined ? false : asBoolean(input.autoRenewToMonthly);
  const paymentFrequency = input.paymentFrequency === undefined
    ? "monthly"
    : input.paymentFrequency === "monthly" || input.paymentFrequency === "quarterly" || input.paymentFrequency === "annually"
      ? input.paymentFrequency
      : null;
  const paymentStartDate = input.paymentStartDate === undefined ? startDate : asIsoDate(input.paymentStartDate);
  const dueDayOfMonth = input.dueDayOfMonth === undefined ? null : asInteger(input.dueDayOfMonth);

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

  if (termType === null && input.termType !== undefined) {
    return { success: false, code: "VALIDATION_ERROR", error: "termType must be fixed or month_to_month" };
  }

  if (fixedTermMonths !== null && fixedTermMonths <= 0) {
    return { success: false, code: "VALIDATION_ERROR", error: "fixedTermMonths must be a positive integer" };
  }

  if (autoRenewToMonthly === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "autoRenewToMonthly must be a boolean" };
  }

  if (paymentFrequency === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "paymentFrequency must be monthly, quarterly, or annually" };
  }

  if (paymentStartDate === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "paymentStartDate must be YYYY-MM-DD" };
  }

  if (dueDayOfMonth !== null && (dueDayOfMonth < 1 || dueDayOfMonth > 31)) {
    return { success: false, code: "VALIDATION_ERROR", error: "dueDayOfMonth must be between 1 and 31" };
  }

  const endDateRaw = input.endDate;
  let endDate: string | null = null;
  if (endDateRaw !== null && endDateRaw !== undefined) {
    endDate = asIsoDate(endDateRaw);
    if (endDate === null) {
      return { success: false, code: "VALIDATION_ERROR", error: "endDate must be YYYY-MM-DD or null" };
    }
  }

  const resolvedTermType = termType ?? (endDate === null ? "month_to_month" : "fixed");

  if (resolvedTermType === "fixed" && fixedTermMonths === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "fixedTermMonths is required for fixed leases" };
  }

  if (resolvedTermType === "month_to_month" && fixedTermMonths !== null) {
    return { success: false, code: "VALIDATION_ERROR", error: "fixedTermMonths is only allowed for fixed leases" };
  }

  const chargesRaw = Array.isArray(input.charges) ? input.charges : [];
  const charges: CreateLeaseChargeInput[] = [];
  for (const charge of chargesRaw) {
    const parsedCharge = parseLeaseChargeInput(charge);
    if (!parsedCharge.success) {
      return parsedCharge;
    }
    charges.push(parsedCharge.data);
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
      termType: resolvedTermType,
      fixedTermMonths,
      autoRenewToMonthly,
      paymentFrequency,
      paymentStartDate,
      dueDayOfMonth: dueDayOfMonth ?? Number(paymentStartDate.substring(8, 10)),
      charges
    }
  };
}

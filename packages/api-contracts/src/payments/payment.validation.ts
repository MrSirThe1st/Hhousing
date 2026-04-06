import type { ApiResult } from "../api-result.types";
import type { CreatePaymentInput, GenerateRentChargesInput, MarkPaymentPaidInput } from "./payment.types";

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

export function parseCreatePaymentInput(input: unknown): ApiResult<CreatePaymentInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const leaseId = asNonEmptyText(input.leaseId);
  const tenantId = asNonEmptyText(input.tenantId);
  const amount = asPositiveNumber(input.amount);
  const currencyCode = asNonEmptyText(input.currencyCode);
  const dueDate = asIsoDate(input.dueDate);
  const paymentKind = input.paymentKind === undefined
    ? "other"
    : input.paymentKind === "rent"
      || input.paymentKind === "deposit"
      || input.paymentKind === "prorated_rent"
      || input.paymentKind === "fee"
      || input.paymentKind === "other"
      ? input.paymentKind
      : null;
  const billingFrequency = input.billingFrequency === undefined
    ? "one_time"
    : input.billingFrequency === "one_time"
      || input.billingFrequency === "monthly"
      || input.billingFrequency === "quarterly"
      || input.billingFrequency === "annually"
      ? input.billingFrequency
      : null;
  const sourceLeaseChargeTemplateId = asOptionalText(input.sourceLeaseChargeTemplateId);
  const isInitialCharge = input.isInitialCharge === undefined ? false : typeof input.isInitialCharge === "boolean" ? input.isInitialCharge : null;

  if (organizationId === null || leaseId === null || tenantId === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "organizationId, leaseId, tenantId are required" };
  }

  if (amount === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "amount must be a positive number" };
  }

  if (currencyCode === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "currencyCode is required" };
  }

  if (dueDate === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "dueDate must be YYYY-MM-DD" };
  }

  if (paymentKind === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "paymentKind is invalid" };
  }

  if (billingFrequency === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "billingFrequency is invalid" };
  }

  if (isInitialCharge === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "isInitialCharge must be a boolean" };
  }

  return {
    success: true,
    data: {
      organizationId,
      leaseId,
      tenantId,
      amount,
      currencyCode,
      dueDate,
      note: asOptionalText(input.note),
      paymentKind,
      billingFrequency,
      sourceLeaseChargeTemplateId,
      isInitialCharge
    }
  };
}

export function parseGenerateRentChargesInput(
  input: unknown,
  sessionOrganizationId: string
): ApiResult<GenerateRentChargesInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const period = asNonEmptyText(input.period);
  if (period === null || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(period)) {
    return { success: false, code: "VALIDATION_ERROR", error: "period must be YYYY-MM" };
  }

  return {
    success: true,
    data: { organizationId: sessionOrganizationId, period }
  };
}

export function parseMarkPaymentPaidInput(
  paymentId: string,
  input: unknown,
  sessionOrganizationId: string
): ApiResult<MarkPaymentPaidInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const paidDate = asIsoDate(input.paidDate);
  if (paidDate === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "paidDate must be YYYY-MM-DD" };
  }

  return {
    success: true,
    data: { paymentId, organizationId: sessionOrganizationId, paidDate }
  };
}

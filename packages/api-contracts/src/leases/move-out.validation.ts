import type { ApiResult } from "../api-result.types";
import type { CreateMoveOutInput } from "./move-out.types";

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

function asIsoDate(value: unknown): string | null {
  const text = asNonEmptyText(value);
  if (text === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function asNonNegativeAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

export function parseCreateMoveOutInput(input: unknown): ApiResult<CreateMoveOutInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const departureEffectiveDate = asIsoDate(input.departureEffectiveDate);
  const leaseEndDate = asIsoDate(input.leaseEndDate) ?? departureEffectiveDate;
  const endedBy = input.endedBy === "tenant" || input.endedBy === "landlord" ? input.endedBy : null;
  const depositDisposition =
    input.depositDisposition === "full_refund"
    || input.depositDisposition === "partial_retention"
    || input.depositDisposition === "full_retention"
      ? input.depositDisposition
      : null;
  const depositHeldAmount = asNonNegativeAmount(input.depositHeldAmount);
  const depositAmountOverridden = typeof input.depositAmountOverridden === "boolean"
    ? input.depositAmountOverridden
    : false;
  const currencyCode = asNonEmptyText(input.currencyCode);
  const depositRetentionAmount = asNonNegativeAmount(input.depositRetentionAmount) ?? 0;

  const reasonCode =
    input.reasonCode === undefined || input.reasonCode === null
      ? null
      : input.reasonCode === "end_of_lease"
        || input.reasonCode === "early_departure"
        || input.reasonCode === "tenant_termination"
        || input.reasonCode === "landlord_termination"
        || input.reasonCode === "other"
        ? input.reasonCode
        : null;

  if (input.reasonCode !== undefined && input.reasonCode !== null && reasonCode === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "reasonCode is invalid" };
  }

  if (departureEffectiveDate === null || leaseEndDate === null || endedBy === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "departureEffectiveDate, leaseEndDate, and endedBy are required"
    };
  }

  if (depositDisposition === null || depositHeldAmount === null || currencyCode === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "depositHeldAmount, depositDisposition, and currencyCode are required"
    };
  }

  let retentionAmount = depositRetentionAmount;
  if (depositDisposition === "full_refund") {
    retentionAmount = 0;
  } else if (depositDisposition === "full_retention") {
    retentionAmount = depositHeldAmount;
  } else if (retentionAmount <= 0 || retentionAmount >= depositHeldAmount) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Retenue partielle: montant entre 0 et le dépôt (exclus)"
    };
  }

  const retentionReasonCode =
    input.depositRetentionReasonCode === undefined || input.depositRetentionReasonCode === null
      ? null
      : input.depositRetentionReasonCode === "damage"
        || input.depositRetentionReasonCode === "unpaid_rent"
        || input.depositRetentionReasonCode === "cleaning"
        || input.depositRetentionReasonCode === "other"
        ? input.depositRetentionReasonCode
        : null;

  if (
    input.depositRetentionReasonCode !== undefined
    && input.depositRetentionReasonCode !== null
    && retentionReasonCode === null
  ) {
    return { success: false, code: "VALIDATION_ERROR", error: "depositRetentionReasonCode is invalid" };
  }

  if (retentionAmount > 0 && retentionReasonCode === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Motif de la retenue requis"
    };
  }

  return {
    success: true,
    data: {
      departureEffectiveDate,
      leaseEndDate,
      endedBy,
      reasonCode,
      reasonNote: asOptionalText(input.reasonNote),
      depositHeldAmount,
      depositAmountOverridden,
      depositDisposition,
      depositRetentionAmount: retentionAmount,
      depositRetentionReasonCode: retentionAmount > 0 ? retentionReasonCode : null,
      depositRetentionNote: asOptionalText(input.depositRetentionNote),
      currencyCode
    }
  };
}

/** @deprecated Legacy wizard parser — kept for unused routes. */
export function parseUpsertMoveOutInput(input: unknown): ApiResult<never> {
  void input;
  return {
    success: false,
    code: "FEATURE_DISABLED",
    error: "Utilisez le parcours Fin de location (POST /move-out)."
  };
}

/** @deprecated */
export function parseUpsertMoveOutInspectionInput(input: unknown): ApiResult<never> {
  void input;
  return {
    success: false,
    code: "FEATURE_DISABLED",
    error: "L'inspection formelle n'est plus utilisée dans Fin de location."
  };
}

/** @deprecated */
export function parseCloseMoveOutInput(input: unknown): ApiResult<never> {
  void input;
  return {
    success: false,
    code: "FEATURE_DISABLED",
    error: "La clôture comptable n'est plus utilisée dans Fin de location."
  };
}

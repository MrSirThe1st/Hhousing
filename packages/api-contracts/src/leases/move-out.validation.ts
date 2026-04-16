import type { ApiResult } from "../api-result.types";
import type {
  CloseMoveOutInput,
  UpsertMoveOutChargeInput,
  UpsertMoveOutInput,
  UpsertMoveOutInspectionInput
} from "./move-out.types";

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

function parseMoveOutChargeInput(input: unknown): ApiResult<UpsertMoveOutChargeInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Each move-out charge must be an object" };
  }

  const chargeType = input.chargeType === "unpaid_rent"
    || input.chargeType === "prorated_rent"
    || input.chargeType === "fee"
    || input.chargeType === "damage"
    || input.chargeType === "cleaning"
    || input.chargeType === "penalty"
    || input.chargeType === "deposit_deduction"
    || input.chargeType === "credit"
    ? input.chargeType
    : null;
  const amount = typeof input.amount === "number" && Number.isFinite(input.amount) && input.amount > 0
    ? input.amount
    : null;
  const currencyCode = asNonEmptyText(input.currencyCode);

  if (chargeType === null || amount === null || currencyCode === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Each move-out charge requires chargeType, amount, and currencyCode"
    };
  }

  return {
    success: true,
    data: {
      chargeType,
      amount,
      currencyCode,
      note: asOptionalText(input.note),
      sourceReferenceType: asOptionalText(input.sourceReferenceType),
      sourceReferenceId: asOptionalText(input.sourceReferenceId)
    }
  };
}

export function parseUpsertMoveOutInput(input: unknown): ApiResult<UpsertMoveOutInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const moveOutDate = asIsoDate(input.moveOutDate);
  const status = input.status === undefined
    ? "draft"
    : input.status === "draft" || input.status === "confirmed"
      ? input.status
      : null;

  if (moveOutDate === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "moveOutDate must be YYYY-MM-DD" };
  }

  if (status === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "status must be draft or confirmed" };
  }

  const chargesRaw = Array.isArray(input.charges) ? input.charges : [];
  const charges: UpsertMoveOutChargeInput[] = [];
  for (const charge of chargesRaw) {
    const parsedCharge = parseMoveOutChargeInput(charge);
    if (!parsedCharge.success) {
      return parsedCharge;
    }
    charges.push(parsedCharge.data);
  }

  return {
    success: true,
    data: {
      moveOutDate,
      reason: asOptionalText(input.reason),
      status,
      charges
    }
  };
}

export function parseUpsertMoveOutInspectionInput(input: unknown): ApiResult<UpsertMoveOutInspectionInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const checklistRaw = Array.isArray(input.checklistSnapshot) ? input.checklistSnapshot : null;
  if (checklistRaw === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "checklistSnapshot must be an array" };
  }

  const checklistSnapshot = [] as UpsertMoveOutInspectionInput["checklistSnapshot"];
  for (const item of checklistRaw) {
    if (!isObject(item)) {
      return { success: false, code: "VALIDATION_ERROR", error: "Each checklist item must be an object" };
    }

    const id = asNonEmptyText(item.id);
    const label = asNonEmptyText(item.label);
    const isChecked = typeof item.isChecked === "boolean" ? item.isChecked : null;

    if (id === null || label === null || isChecked === null) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Each checklist item requires id, label, and isChecked"
      };
    }

    checklistSnapshot.push({
      id,
      label,
      isChecked,
      note: asOptionalText(item.note)
    });
  }

  const photoDocumentIds = Array.isArray(input.photoDocumentIds)
    ? input.photoDocumentIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const inspectedAt = input.inspectedAt === undefined || input.inspectedAt === null
    ? null
    : asIsoDate(input.inspectedAt);

  if (input.inspectedAt !== undefined && input.inspectedAt !== null && inspectedAt === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "inspectedAt must be YYYY-MM-DD or null" };
  }

  return {
    success: true,
    data: {
      checklistSnapshot,
      notes: asOptionalText(input.notes),
      photoDocumentIds,
      inspectedAt
    }
  };
}

export function parseCloseMoveOutInput(input: unknown): ApiResult<CloseMoveOutInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const closureLedgerEventId = typeof input.closureLedgerEventId === "number"
    && Number.isInteger(input.closureLedgerEventId)
    && input.closureLedgerEventId > 0
    ? input.closureLedgerEventId
    : null;

  if (closureLedgerEventId === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "closureLedgerEventId must be a positive integer"
    };
  }

  return {
    success: true,
    data: { closureLedgerEventId }
  };
}
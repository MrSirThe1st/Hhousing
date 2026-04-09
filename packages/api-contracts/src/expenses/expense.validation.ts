import type { ExpenseCategory } from "@hhousing/domain";
import type { ApiResult } from "../api-result.types";
import type { CreateExpenseInput, UpdateExpenseInput } from "./expense.types";

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

export function parseExpenseCategory(value: unknown): ExpenseCategory | null {
  return value === "maintenance"
    || value === "utilities"
    || value === "taxes"
    || value === "insurance"
    || value === "supplies"
    || value === "payroll"
    || value === "cleaning"
    || value === "security"
    || value === "legal"
    || value === "marketing"
    || value === "admin"
    || value === "other"
    ? value
    : null;
}

function parseExpenseInput(input: unknown): ApiResult<CreateExpenseInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const propertyId = asOptionalText(input.propertyId);
  const unitId = asOptionalText(input.unitId);
  const title = asNonEmptyText(input.title);
  const category = parseExpenseCategory(input.category);
  const amount = asPositiveNumber(input.amount);
  const currencyCode = asNonEmptyText(input.currencyCode);
  const expenseDate = asIsoDate(input.expenseDate);

  if (organizationId === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "organizationId is required" };
  }

  if (title === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "title is required" };
  }

  if (unitId !== null && propertyId === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "unitId requires propertyId" };
  }

  if (category === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "category is invalid" };
  }

  if (amount === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "amount must be a positive number" };
  }

  if (currencyCode === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "currencyCode is required" };
  }

  if (expenseDate === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "expenseDate must be YYYY-MM-DD" };
  }

  return {
    success: true,
    data: {
      organizationId,
      propertyId,
      unitId,
      title,
      category,
      vendorName: asOptionalText(input.vendorName),
      payeeName: asOptionalText(input.payeeName),
      amount,
      currencyCode,
      expenseDate,
      note: asOptionalText(input.note)
    }
  };
}

export function parseCreateExpenseInput(input: unknown): ApiResult<CreateExpenseInput> {
  return parseExpenseInput(input);
}

export function parseUpdateExpenseInput(input: unknown): ApiResult<UpdateExpenseInput> {
  return parseExpenseInput(input);
}
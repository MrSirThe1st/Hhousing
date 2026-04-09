import type {
  ApiResult,
  AuthSession,
  CreateExpenseOutput,
  DeleteExpenseOutput,
  ListExpensesOutput
} from "@hhousing/api-contracts";
import {
  Permission,
  parseCreateExpenseInput,
  parseExpenseCategory,
  parseUpdateExpenseInput,
  type ExpenseCategory
} from "@hhousing/api-contracts";
import type { ExpenseRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";
import type { TeamPermissionRepository } from "../organizations/permissions";
import { requirePermission } from "../organizations/permissions";

export interface CreateExpenseRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateExpenseResponse {
  status: number;
  body: ApiResult<CreateExpenseOutput>;
}

export interface CreateExpenseDeps {
  repository: ExpenseRepository;
  createId: () => string;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function createExpense(
  request: CreateExpenseRequest,
  deps: CreateExpenseDeps
): Promise<CreateExpenseResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.RECORD_PAYMENT,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const parsed = parseCreateExpenseInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const expense = await deps.repository.createExpense({
    id: deps.createId(),
    organizationId: parsed.data.organizationId,
    propertyId: parsed.data.propertyId ?? null,
    unitId: parsed.data.unitId ?? null,
    title: parsed.data.title,
    category: parsed.data.category,
    vendorName: parsed.data.vendorName,
    payeeName: parsed.data.payeeName,
    amount: parsed.data.amount,
    currencyCode: parsed.data.currencyCode,
    expenseDate: parsed.data.expenseDate,
    note: parsed.data.note
  });

  return { status: 201, body: { success: true, data: expense } };
}

export interface ListExpensesRequest {
  organizationId: string | null;
  propertyId: string | null;
  category: string | null;
  session: AuthSession | null;
}

export interface ListExpensesResponse {
  status: number;
  body: ApiResult<ListExpensesOutput>;
}

export interface ListExpensesDeps {
  repository: ExpenseRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export interface UpdateExpenseRequest {
  expenseId: string;
  body: unknown;
  session: AuthSession | null;
}

export interface UpdateExpenseResponse {
  status: number;
  body: ApiResult<CreateExpenseOutput>;
}

export interface UpdateExpenseDeps {
  repository: ExpenseRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export interface DeleteExpenseRequest {
  expenseId: string;
  session: AuthSession | null;
}

export interface DeleteExpenseResponse {
  status: number;
  body: ApiResult<DeleteExpenseOutput>;
}

export interface DeleteExpenseDeps {
  repository: ExpenseRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

function parseCategory(category: string | null): ApiResult<ExpenseCategory | undefined> {
  if (category === null) {
    return { success: true, data: undefined };
  }

  const parsed = parseExpenseCategory(category);
  if (parsed === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "category is invalid" };
  }

  return { success: true, data: parsed };
}

export async function listExpenses(
  request: ListExpensesRequest,
  deps: ListExpensesDeps
): Promise<ListExpensesResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.VIEW_PAYMENTS,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const organizationId = request.organizationId ?? sessionResult.data.organizationId ?? "";
  if (organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const categoryResult = parseCategory(request.category);
  if (!categoryResult.success) {
    return { status: mapErrorCodeToHttpStatus(categoryResult.code), body: categoryResult };
  }

  const expenses = await deps.repository.listExpenses({
    organizationId,
    propertyId: request.propertyId ?? undefined,
    category: categoryResult.data
  });

  return { status: 200, body: { success: true, data: { expenses } } };
}

export async function updateExpense(
  request: UpdateExpenseRequest,
  deps: UpdateExpenseDeps
): Promise<UpdateExpenseResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.RECORD_PAYMENT,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const parsed = parseUpdateExpenseInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const expense = await deps.repository.updateExpense({
    id: request.expenseId,
    organizationId: parsed.data.organizationId,
    propertyId: parsed.data.propertyId ?? null,
    unitId: parsed.data.unitId ?? null,
    title: parsed.data.title,
    category: parsed.data.category,
    vendorName: parsed.data.vendorName,
    payeeName: parsed.data.payeeName,
    amount: parsed.data.amount,
    currencyCode: parsed.data.currencyCode,
    expenseDate: parsed.data.expenseDate,
    note: parsed.data.note
  });

  if (!expense) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Expense not found" }
    };
  }

  return { status: 200, body: { success: true, data: expense } };
}

export async function deleteExpense(
  request: DeleteExpenseRequest,
  deps: DeleteExpenseDeps
): Promise<DeleteExpenseResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.RECORD_PAYMENT,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const deleted = await deps.repository.deleteExpense(request.expenseId, sessionResult.data.organizationId);
  if (!deleted) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Expense not found" }
    };
  }

  return { status: 200, body: { success: true, data: { success: true } } };
}
import type {
  ApiResult,
  AuthSession,
  CreatePaymentOutput,
  GenerateRentChargesOutput,
  MarkPaymentPaidOutput,
  ListPaymentsOutput
} from "@hhousing/api-contracts";
import {
  Permission,
  parseCreatePaymentInput,
  parseGenerateRentChargesInput,
  parseMarkPaymentPaidInput
} from "@hhousing/api-contracts";
import type { PaymentRepository } from "@hhousing/data-access";
import type { PropertyManagementContext } from "@hhousing/domain";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";
import type { TeamPermissionRepository } from "../organizations/permissions";
import { requirePermission } from "../organizations/permissions";

export interface CreatePaymentRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreatePaymentResponse {
  status: number;
  body: ApiResult<CreatePaymentOutput>;
}

export interface CreatePaymentDeps {
  repository: PaymentRepository;
  createId: () => string;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function createPayment(
  request: CreatePaymentRequest,
  deps: CreatePaymentDeps
): Promise<CreatePaymentResponse> {
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

  const parsed = parseCreatePaymentInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const payment = await deps.repository.createPayment({
    id: deps.createId(),
    organizationId: parsed.data.organizationId,
    leaseId: parsed.data.leaseId,
    tenantId: parsed.data.tenantId,
    amount: parsed.data.amount,
    currencyCode: parsed.data.currencyCode,
    dueDate: parsed.data.dueDate,
    note: parsed.data.note
  });

  return { status: 201, body: { success: true, data: payment } };
}

export interface MarkPaymentPaidRequest {
  paymentId: string;
  body: unknown;
  session: AuthSession | null;
}

export interface MarkPaymentPaidResponse {
  status: number;
  body: ApiResult<MarkPaymentPaidOutput>;
}

export interface MarkPaymentPaidDeps {
  repository: PaymentRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function markPaymentPaid(
  request: MarkPaymentPaidRequest,
  deps: MarkPaymentPaidDeps
): Promise<MarkPaymentPaidResponse> {
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

  const parsed = parseMarkPaymentPaidInput(
    request.paymentId,
    request.body,
    sessionResult.data.organizationId ?? ""
  );
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const payment = await deps.repository.markPaymentPaid(parsed.data);
  if (payment === null) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Payment not found or already cancelled" }
    };
  }

  return { status: 200, body: { success: true, data: payment } };
}

export interface ListPaymentsRequest {
  organizationId: string | null;
  leaseId: string | null;
  status: string | null;
  session: AuthSession | null;
}

export interface ListPaymentsResponse {
  status: number;
  body: ApiResult<ListPaymentsOutput>;
}

export interface ListPaymentsDeps {
  repository: PaymentRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function listPayments(
  request: ListPaymentsRequest,
  deps: ListPaymentsDeps
): Promise<ListPaymentsResponse> {
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

  const payments = await deps.repository.listPayments({
    organizationId,
    leaseId: request.leaseId ?? undefined,
    status: request.status ?? undefined
  });

  return { status: 200, body: { success: true, data: { payments } } };
}

export interface GenerateRentChargesRequest {
  body: unknown;
  session: AuthSession | null;
  managementContext?: PropertyManagementContext;
}

export interface GenerateRentChargesResponse {
  status: number;
  body: ApiResult<GenerateRentChargesOutput>;
}

export interface GenerateRentChargesDeps {
  repository: PaymentRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function generateRentCharges(
  request: GenerateRentChargesRequest,
  deps: GenerateRentChargesDeps
): Promise<GenerateRentChargesResponse> {
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

  const parsed = parseGenerateRentChargesInput(
    request.body,
    sessionResult.data.organizationId ?? ""
  );
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const generated = await deps.repository.generateMonthlyCharges(
    parsed.data.organizationId,
    parsed.data.period,
    request.managementContext
  );

  return {
    status: 200,
    body: { success: true, data: { period: parsed.data.period, generated } }
  };
}

import type {
  ApiResult,
  AuthSession,
  CreatePaymentOutput,
  MarkPaymentPaidOutput,
  ListPaymentsOutput
} from "@hhousing/api-contracts";
import {
  parseCreatePaymentInput,
  parseMarkPaymentPaidInput
} from "@hhousing/api-contracts";
import type { PaymentRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

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
}

export async function createPayment(
  request: CreatePaymentRequest,
  deps: CreatePaymentDeps
): Promise<CreatePaymentResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
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
}

export async function markPaymentPaid(
  request: MarkPaymentPaidRequest,
  deps: MarkPaymentPaidDeps
): Promise<MarkPaymentPaidResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
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
}

export async function listPayments(
  request: ListPaymentsRequest,
  deps: ListPaymentsDeps
): Promise<ListPaymentsResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
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

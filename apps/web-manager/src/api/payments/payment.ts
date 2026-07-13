import type {
  ApiResult,
  AuthSession,
  CreatePaymentOutput,
  MarkPaymentPaidOutput,
  ListPaymentsOutput
} from "@hhousing/api-contracts";
import {
  Permission,
  parseCreatePaymentInput,
  parseMarkPaymentPaidInput
} from "@hhousing/api-contracts";
import type {
  InvoiceRepository,
  OrganizationPropertyUnitRepository,
  PaymentRepository,
  TenantLeaseRepository
} from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";
import type { TeamPermissionRepository } from "../organizations/permissions";
import { requirePermission } from "../organizations/permissions";
import { logOperatorAuditEvent } from "../audit-log";
import { tryNotifyPaidInvoice } from "../../lib/notifications/paid-invoice-notification";
import type { notifyPaidInvoice } from "../../lib/notifications/paid-invoice-notification";

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
    deps.teamFunctionsRepository,
    true
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
    note: parsed.data.note,
    paymentKind: parsed.data.paymentKind ?? "other",
    billingFrequency: parsed.data.billingFrequency ?? "one_time",
    sourceLeaseChargeTemplateId: parsed.data.sourceLeaseChargeTemplateId ?? null,
    isInitialCharge: parsed.data.isInitialCharge ?? false
  });

  await logOperatorAuditEvent({
    session: sessionResult.data,
    actionKey: "finance.payment.created",
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      leaseId: payment.leaseId,
      tenantId: payment.tenantId,
      amount: payment.amount,
      currencyCode: payment.currencyCode,
      paymentKind: payment.paymentKind
    }
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
  invoiceRepository?: InvoiceRepository;
  tenantRepository?: TenantLeaseRepository;
  organizationRepository?: OrganizationPropertyUnitRepository;
  notifyPaidInvoice?: typeof notifyPaidInvoice;
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
    deps.teamFunctionsRepository,
    true
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

    if (deps.invoiceRepository && payment.status === "paid") {
      const syncResult = await deps.invoiceRepository.syncInvoiceForPaidPayment({
        organizationId: payment.organizationId,
        paymentId: payment.id,
        leaseId: payment.leaseId,
        tenantId: payment.tenantId,
        amount: payment.amount,
        currencyCode: payment.currencyCode,
        dueDate: payment.dueDate,
        paidDate: payment.paidDate ?? parsed.data.paidDate,
        period: payment.chargePeriod
      });

      if (deps.notifyPaidInvoice && deps.tenantRepository) {
        await tryNotifyPaidInvoice({
          invoice: syncResult.invoice,
          paymentId: payment.id,
          paymentAmount: payment.amount,
          organizationId: payment.organizationId,
          tenantId: payment.tenantId,
          invoiceRepository: deps.invoiceRepository,
          tenantRepository: deps.tenantRepository,
          organizationRepository: deps.organizationRepository,
          notifyPaidInvoice: deps.notifyPaidInvoice
        });
      }
    }

  await logOperatorAuditEvent({
    session: sessionResult.data,
    actionKey: "finance.payment.mark_paid",
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      leaseId: payment.leaseId,
      tenantId: payment.tenantId,
      amount: payment.amount,
      currencyCode: payment.currencyCode,
      paidDate: payment.paidDate
    }
  });

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

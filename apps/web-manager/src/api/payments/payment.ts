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
import type { Invoice, Organization } from "@hhousing/domain";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";
import type { TeamPermissionRepository } from "../organizations/permissions";
import { requirePermission } from "../organizations/permissions";
import { logOperatorAuditEvent } from "../audit-log";

function formatCurrency(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
}

function shouldSendPaidInvoiceEmail(invoice: Invoice): boolean {
  return invoice.status === "paid" && (invoice.emailStatus === "not_sent" || invoice.emailStatus === "failed");
}

async function sendPaidInvoiceEmail(
  invoice: Invoice,
  tenantName: string,
  tenantEmail: string,
  organization: Organization | null | undefined,
  sendEmail: NonNullable<MarkPaymentPaidDeps["sendInvoicePaidEmail"]>
): Promise<void> {
  await sendEmail({
    to: tenantEmail,
    subject: `Facture ${invoice.invoiceNumber}`,
    body: [
      `Bonjour ${tenantName},`,
      "",
      `Votre facture ${invoice.invoiceNumber} est maintenant marquée comme payée.`,
      `Montant total: ${formatCurrency(invoice.totalAmount, invoice.currencyCode)}`,
      `Montant payé: ${formatCurrency(invoice.amountPaid, invoice.currencyCode)}`,
      `Reste à payer: ${formatCurrency(Math.max(0, invoice.totalAmount - invoice.amountPaid), invoice.currencyCode)}`,
      `Échéance: ${invoice.dueDate}`,
      "",
      "Merci."
    ].join("\n"),
    organization
  });
}

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
  sendInvoicePaidEmail?: (input: {
    to: string;
    subject: string;
    body: string;
    organization?: Organization | null;
  }) => Promise<void>;
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

    if (deps.sendInvoicePaidEmail && deps.tenantRepository && shouldSendPaidInvoiceEmail(syncResult.invoice)) {
      const tenant = await deps.tenantRepository.getTenantById(payment.tenantId, payment.organizationId);
      if (tenant?.email) {
        const organization = deps.organizationRepository
          ? await deps.organizationRepository.getOrganizationById(payment.organizationId)
          : null;

        try {
          await sendPaidInvoiceEmail(syncResult.invoice, tenant.fullName, tenant.email, organization, deps.sendInvoicePaidEmail);
          await deps.invoiceRepository.markInvoiceEmailSent(syncResult.invoice.id, payment.organizationId);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          await deps.invoiceRepository.markInvoiceEmailFailed(syncResult.invoice.id, payment.organizationId, message);
        }
      }
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

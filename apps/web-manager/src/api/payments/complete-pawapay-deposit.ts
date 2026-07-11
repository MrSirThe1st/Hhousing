import type { PaymentRepository, InvoiceRepository, TenantLeaseRepository, OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import type { Organization, Payment } from "@hhousing/domain";
import type { PawapayTransactionRepository } from "@hhousing/data-access";
import {
  buildInvoiceDocumentContext,
  buildInvoiceDocumentHtml,
  buildInvoiceEmailHtml
} from "../../lib/invoices/invoice-document";
import type { ManagedEmailAttachmentInput } from "../../lib/email/resend";
import { getNow } from "../../lib/time";
import { logOperatorAuditEvent } from "../audit-log";

function formatCurrency(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
}

async function sendPaidInvoiceEmail(
  invoice: Awaited<ReturnType<InvoiceRepository["syncInvoiceForPaidPayment"]>>["invoice"],
  tenantName: string,
  tenantEmail: string,
  organization: Organization | null | undefined,
  sendEmail: (input: {
    to: string;
    subject: string;
    html: string;
    attachments?: ManagedEmailAttachmentInput[];
  }) => Promise<void>
): Promise<void> {
  const formatDate = (value: string): string =>
    new Date(value).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

  const invoiceDocumentHtml = buildInvoiceDocumentHtml(
    buildInvoiceDocumentContext({
      invoice,
      tenantName,
      tenantEmail,
      organization,
      formatDate
    })
  );

  const attachmentContentBase64 = Buffer.from(invoiceDocumentHtml, "utf-8").toString("base64");
  const attachments: ManagedEmailAttachmentInput[] = [
    {
      fileName: `facture-${invoice.invoiceNumber}.html`,
      mimeType: "text/html",
      fileUrl: `data:text/html;base64,${attachmentContentBase64}`
    }
  ];

  const emailHtml = buildInvoiceEmailHtml({
    tenantName,
    organization,
    invoiceNumber: invoice.invoiceNumber,
    amountLabel: formatCurrency(invoice.totalAmount, invoice.currencyCode),
    remainingLabel: formatCurrency(Math.max(0, invoice.totalAmount - invoice.amountPaid), invoice.currencyCode),
    dueDateLabel: formatDate(invoice.dueDate),
    issueDateLabel: formatDate(invoice.issueDate),
    periodLabel: invoice.period ?? "Facture ponctuelle",
    currencyCode: invoice.currencyCode
  });

  await sendEmail({
    to: tenantEmail,
    subject: `Facture ${invoice.invoiceNumber}`,
    html: emailHtml,
    attachments
  });
}

export async function finalizePaidPayment(params: {
  payment: Payment;
  paidDate: string;
  paymentRepository: PaymentRepository;
  invoiceRepository: InvoiceRepository;
  tenantRepository: TenantLeaseRepository;
  organizationRepository?: OrganizationPropertyUnitRepository;
  sendInvoicePaidEmail?: (input: {
    to: string;
    subject: string;
    html: string;
    attachments?: ManagedEmailAttachmentInput[];
  }) => Promise<void>;
}): Promise<Payment | null> {
  const paidPayment = await params.paymentRepository.markPaymentPaid({
    paymentId: params.payment.id,
    organizationId: params.payment.organizationId,
    paidDate: params.paidDate
  });

  if (!paidPayment) {
    return null;
  }

  const syncResult = await params.invoiceRepository.syncInvoiceForPaidPayment({
    organizationId: paidPayment.organizationId,
    paymentId: paidPayment.id,
    leaseId: paidPayment.leaseId,
    tenantId: paidPayment.tenantId,
    amount: paidPayment.amount,
    currencyCode: paidPayment.currencyCode,
    dueDate: paidPayment.dueDate,
    paidDate: paidPayment.paidDate ?? params.paidDate,
    period: paidPayment.chargePeriod
  });

  if (
    params.sendInvoicePaidEmail &&
    syncResult.invoice.status === "paid" &&
    (syncResult.invoice.emailStatus === "not_sent" || syncResult.invoice.emailStatus === "failed")
  ) {
    const tenant = await params.tenantRepository.getTenantById(
      paidPayment.tenantId,
      paidPayment.organizationId
    );

    if (tenant?.email) {
      const organization = params.organizationRepository
        ? await params.organizationRepository.getOrganizationById(paidPayment.organizationId)
        : null;

      try {
        await sendPaidInvoiceEmail(
          syncResult.invoice,
          tenant.fullName,
          tenant.email,
          organization,
          params.sendInvoicePaidEmail
        );
        await params.invoiceRepository.markInvoiceEmailSent(
          syncResult.invoice.id,
          paidPayment.organizationId
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await params.invoiceRepository.markInvoiceEmailFailed(
          syncResult.invoice.id,
          paidPayment.organizationId,
          message
        );
      }
    }
  }

  return paidPayment;
}

export async function completePawapayDepositTransaction(params: {
  transactionId: string;
  pawapayStatus: string;
  pawapayTransactionRepository: PawapayTransactionRepository;
  paymentRepository: PaymentRepository;
  invoiceRepository: InvoiceRepository;
  tenantRepository: TenantLeaseRepository;
  organizationRepository?: OrganizationPropertyUnitRepository;
  sendInvoicePaidEmail?: (input: {
    to: string;
    subject: string;
    html: string;
    attachments?: ManagedEmailAttachmentInput[];
  }) => Promise<void>;
}): Promise<{ completed: boolean; alreadyProcessed: boolean }> {
  const transaction = await params.pawapayTransactionRepository.getTransactionById(params.transactionId);
  if (!transaction) {
    return { completed: false, alreadyProcessed: false };
  }

  if (transaction.status === "completed" || transaction.status === "failed") {
    return { completed: transaction.status === "completed", alreadyProcessed: true };
  }

  const paidDate = getNow().toISOString().substring(0, 10);

  for (const allocation of transaction.allocations) {
    const payment = await params.paymentRepository.getPaymentById(
      allocation.paymentId,
      transaction.organizationId
    );

    if (!payment || payment.status === "paid" || payment.status === "cancelled") {
      continue;
    }

    await finalizePaidPayment({
      payment,
      paidDate,
      paymentRepository: params.paymentRepository,
      invoiceRepository: params.invoiceRepository,
      tenantRepository: params.tenantRepository,
      organizationRepository: params.organizationRepository,
      sendInvoicePaidEmail: params.sendInvoicePaidEmail
    });
  }

  await params.pawapayTransactionRepository.updateTransactionStatus({
    transactionId: transaction.id,
    status: "completed",
    pawapayStatus: params.pawapayStatus
  });

  await logOperatorAuditEvent({
    organizationId: transaction.organizationId,
    actionKey: "finance.pawapay.deposit.completed",
    entityType: "pawapay_transaction",
    entityId: transaction.id,
    metadata: {
      tenantId: transaction.tenantId,
      leaseId: transaction.leaseId,
      totalAmount: transaction.totalAmount,
      currencyCode: transaction.currencyCode,
      provider: transaction.provider,
      pawapayStatus: params.pawapayStatus,
      paymentIds: transaction.allocations.map((allocation) => allocation.paymentId)
    }
  });

  return { completed: true, alreadyProcessed: false };
}

export async function failPawapayDepositTransaction(params: {
  transactionId: string;
  pawapayStatus: string;
  failureCode?: string | null;
  failureMessage?: string | null;
  pawapayTransactionRepository: PawapayTransactionRepository;
}): Promise<void> {
  const transaction = await params.pawapayTransactionRepository.getTransactionById(params.transactionId);
  if (!transaction || transaction.status === "completed" || transaction.status === "failed") {
    return;
  }

  await params.pawapayTransactionRepository.updateTransactionStatus({
    transactionId: params.transactionId,
    status: "failed",
    pawapayStatus: params.pawapayStatus,
    failureCode: params.failureCode ?? null,
    failureMessage: params.failureMessage ?? null
  });

  await logOperatorAuditEvent({
    organizationId: transaction.organizationId,
    actionKey: "finance.pawapay.deposit.failed",
    entityType: "pawapay_transaction",
    entityId: transaction.id,
    metadata: {
      tenantId: transaction.tenantId,
      failureCode: params.failureCode ?? null,
      failureMessage: params.failureMessage ?? null,
      pawapayStatus: params.pawapayStatus
    }
  });
}

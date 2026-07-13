import type {
  InvoiceRepository,
  OrganizationPropertyUnitRepository,
  PaymentRepository,
  PawapayTransactionRepository,
  TenantLeaseRepository
} from "@hhousing/data-access";
import type { Payment } from "@hhousing/domain";
import { getNow } from "../../lib/time";
import { logOperatorAuditEvent } from "../audit-log";
import { tryNotifyPaidInvoice } from "../../lib/notifications/paid-invoice-notification";
import type { notifyPaidInvoice } from "../../lib/notifications/paid-invoice-notification";

export async function finalizePaidPayment(params: {
  payment: Payment;
  paidDate: string;
  paymentRepository: PaymentRepository;
  invoiceRepository: InvoiceRepository;
  tenantRepository: TenantLeaseRepository;
  organizationRepository?: OrganizationPropertyUnitRepository;
  notifyPaidInvoice?: typeof notifyPaidInvoice;
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

  if (params.notifyPaidInvoice) {
    await tryNotifyPaidInvoice({
      invoice: syncResult.invoice,
      paymentId: paidPayment.id,
      paymentAmount: paidPayment.amount,
      organizationId: paidPayment.organizationId,
      tenantId: paidPayment.tenantId,
      invoiceRepository: params.invoiceRepository,
      tenantRepository: params.tenantRepository,
      organizationRepository: params.organizationRepository,
      notifyPaidInvoice: params.notifyPaidInvoice
    });
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
  notifyPaidInvoice?: typeof notifyPaidInvoice;
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
      notifyPaidInvoice: params.notifyPaidInvoice
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

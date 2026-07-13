import { processPawapayDepositCallback } from "../../../../../api/payments/process-pawapay-deposit-callback";
import { createPaidInvoiceNotificationDepsFromEnv } from "../../../../../lib/notifications/payment-confirmation-notifiers";
import {
  createInvoiceRepo,
  createPaymentRepo,
  createPawapayTransactionRepo,
  createRepositoryFromEnv,
  createTenantLeaseRepo,
  jsonResponse
} from "../../../shared";

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const organizationRepositoryResult = createRepositoryFromEnv();

  const paidInvoiceNotificationDeps = createPaidInvoiceNotificationDepsFromEnv();

  const result = await processPawapayDepositCallback({
    request,
    rawBody,
    pawapayTransactionRepository: createPawapayTransactionRepo(),
    paymentRepository: createPaymentRepo(),
    invoiceRepository: createInvoiceRepo(),
    tenantRepository: createTenantLeaseRepo(),
    organizationRepository: organizationRepositoryResult.success
      ? organizationRepositoryResult.data
      : undefined,
    notifyPaidInvoice: paidInvoiceNotificationDeps.notifyPaidInvoice
  });

  return jsonResponse(result.status, result.body);
}

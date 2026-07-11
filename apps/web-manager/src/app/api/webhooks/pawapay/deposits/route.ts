import { processPawapayDepositCallback } from "../../../../../api/payments/process-pawapay-deposit-callback";
import { sendRawHtmlEmailFromEnv } from "../../../../../lib/email/resend";
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
    sendInvoicePaidEmail: sendRawHtmlEmailFromEnv
  });

  return jsonResponse(result.status, result.body);
}

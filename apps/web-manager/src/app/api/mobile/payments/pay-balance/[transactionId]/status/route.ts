import { extractTenantSessionFromRequest } from "../../../../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../../../../api/shared";
import { refreshPawapayDepositTransactionStatus } from "../../../../../../../api/payments/process-pawapay-deposit-callback";
import { sendRawHtmlEmailFromEnv } from "../../../../../../../lib/email/resend";
import {
  createInvoiceRepo,
  createPaymentRepo,
  createPawapayTransactionRepo,
  createRepositoryFromEnv,
  createTenantLeaseRepo,
  jsonResponse
} from "../../../../../shared";

export async function GET(
  request: Request,
  context: { params: Promise<{ transactionId: string }> }
): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const { transactionId } = await context.params;
  const pawapayTransactionRepository = createPawapayTransactionRepo();
  const organizationRepositoryResult = createRepositoryFromEnv();

  let transaction = await pawapayTransactionRepository.getTransactionByIdForTenant(
    transactionId,
    access.data.userId,
    access.data.organizationId
  );

  if (!transaction) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Transaction introuvable."
    });
  }

  if (transaction.status === "submitted") {
    await refreshPawapayDepositTransactionStatus({
      transactionId,
      pawapayTransactionRepository,
      paymentRepository: createPaymentRepo(),
      invoiceRepository: createInvoiceRepo(),
      tenantRepository: createTenantLeaseRepo(),
      organizationRepository: organizationRepositoryResult.success
        ? organizationRepositoryResult.data
        : undefined,
      sendInvoicePaidEmail: sendRawHtmlEmailFromEnv
    });

    transaction = await pawapayTransactionRepository.getTransactionByIdForTenant(
      transactionId,
      access.data.userId,
      access.data.organizationId
    );
  }

  if (!transaction) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Transaction introuvable."
    });
  }

  return jsonResponse(200, {
    success: true,
    data: {
      transactionId: transaction.id,
      status: transaction.status,
      pawapayStatus: transaction.pawapayStatus,
      totalAmount: transaction.totalAmount,
      currencyCode: transaction.currencyCode,
      provider: transaction.provider,
      failureCode: transaction.failureCode,
      failureMessage: transaction.failureMessage,
      paymentCount: transaction.allocations.length,
      completedAtIso: transaction.completedAtIso
    }
  });
}

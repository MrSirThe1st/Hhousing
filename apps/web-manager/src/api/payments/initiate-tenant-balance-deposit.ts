import { randomUUID } from "node:crypto";
import type { Payment, PawapayProviderCode } from "@hhousing/domain";
import type { PawapayTransactionRepository, PaymentRepository, TenantLeaseRepository } from "@hhousing/data-access";
import { normalizeDrcPhoneNumber } from "../../lib/pawapay/amount";
import { initiatePawapayDeposit, PawapayClientError } from "../../lib/pawapay/client";
import { isPawapayProviderCode } from "../../lib/pawapay/config";

export interface InitiateTenantBalanceDepositInput {
  tenantAuthUserId: string;
  organizationId: string;
  provider: string;
  phoneNumber: string;
}

export type InitiateTenantBalanceDepositResult =
  | {
      success: true;
      data: {
        transactionId: string;
        totalAmount: number;
        currencyCode: string;
        provider: PawapayProviderCode;
        status: "submitted" | "failed";
        paymentCount: number;
        pawapayStatus: string;
        failureMessage?: string;
      };
    }
  | {
      success: false;
      code: string;
      error: string;
    };

function getPayablePayments(payments: Payment[]): Payment[] {
  return payments
    .filter((payment) => payment.status === "pending" || payment.status === "overdue")
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
}

export async function initiateTenantBalanceDeposit(
  input: InitiateTenantBalanceDepositInput,
  deps: {
    tenantRepository: TenantLeaseRepository;
    paymentRepository: PaymentRepository;
    pawapayTransactionRepository: PawapayTransactionRepository;
  }
): Promise<InitiateTenantBalanceDepositResult> {
  if (!isPawapayProviderCode(input.provider)) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Fournisseur mobile money invalide."
    };
  }

  const normalizedPhone = normalizeDrcPhoneNumber(input.phoneNumber);
  if (!normalizedPhone) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Numéro de téléphone invalide. Utilisez un numéro congolais (+243...)."
    };
  }

  const lease = await deps.tenantRepository.getCurrentLeaseByTenantAuthUserId(
    input.tenantAuthUserId,
    input.organizationId
  );

  if (!lease) {
    return {
      success: false,
      code: "NOT_FOUND",
      error: "Aucun bail actif trouvé."
    };
  }

  const tenant = await deps.tenantRepository.getTenantById(lease.tenantId, input.organizationId);
  if (!tenant) {
    return {
      success: false,
      code: "NOT_FOUND",
      error: "Profil locataire introuvable."
    };
  }

  const hasInFlight = await deps.pawapayTransactionRepository.hasInFlightTransactionForTenant(
    tenant.id,
    input.organizationId
  );
  if (hasInFlight) {
    return {
      success: false,
      code: "CONFLICT",
      error: "Un paiement mobile est déjà en cours. Patientez quelques instants."
    };
  }

  const payments = await deps.paymentRepository.listPaymentsByTenantAuthUserId(
    input.tenantAuthUserId,
    input.organizationId
  );
  const payablePayments = getPayablePayments(payments);

  if (payablePayments.length === 0) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Aucun paiement en attente."
    };
  }

  const currencyCodes = [...new Set(payablePayments.map((payment) => payment.currencyCode))];
  if (currencyCodes.length !== 1) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Impossible de payer plusieurs devises en une seule transaction."
    };
  }

  const totalAmount = payablePayments.reduce((sum, payment) => sum + payment.amount, 0);
  const transactionId = randomUUID();

  await deps.pawapayTransactionRepository.createTransaction({
    id: transactionId,
    organizationId: input.organizationId,
    tenantId: tenant.id,
    leaseId: lease.id,
    operationType: "deposit",
    totalAmount,
    currencyCode: currencyCodes[0],
    provider: input.provider,
    phoneNumber: normalizedPhone,
    allocations: payablePayments.map((payment) => ({
      paymentId: payment.id,
      amount: payment.amount
    }))
  });

  try {
    const pawapayResponse = await initiatePawapayDeposit({
      depositId: transactionId,
      amount: totalAmount,
      currencyCode: currencyCodes[0],
      provider: input.provider,
      phoneNumber: normalizedPhone
    });

    if (pawapayResponse.status === "REJECTED") {
      await deps.pawapayTransactionRepository.updateTransactionStatus({
        transactionId,
        status: "failed",
        pawapayStatus: pawapayResponse.status,
        failureCode: pawapayResponse.failureReason?.failureCode ?? null,
        failureMessage: pawapayResponse.failureReason?.failureMessage ?? "Paiement refusé par PawaPay."
      });

      return {
        success: false,
        code: "PAYMENT_REJECTED",
        error: pawapayResponse.failureReason?.failureMessage ?? "Paiement refusé par PawaPay."
      };
    }

    await deps.pawapayTransactionRepository.updateTransactionStatus({
      transactionId,
      status: "submitted",
      pawapayStatus: pawapayResponse.status
    });

    return {
      success: true,
      data: {
        transactionId,
        totalAmount,
        currencyCode: currencyCodes[0],
        provider: input.provider,
        status: "submitted",
        paymentCount: payablePayments.length,
        pawapayStatus: pawapayResponse.status
      }
    };
  } catch (error) {
    const message =
      error instanceof PawapayClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erreur PawaPay inconnue.";

    await deps.pawapayTransactionRepository.updateTransactionStatus({
      transactionId,
      status: "failed",
      pawapayStatus: "REJECTED",
      failureCode: "INTERNAL_ERROR",
      failureMessage: message
    });

    return {
      success: false,
      code: "INTERNAL_ERROR",
      error: message
    };
  }
}

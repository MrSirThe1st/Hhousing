import { readPawapayConfig } from "../../lib/pawapay/config";
import {
  isFinalPawapayDepositStatus,
  isSuccessfulPawapayDepositStatus
} from "../../lib/pawapay/amount";
import { getPawapayDepositStatus } from "../../lib/pawapay/client";
import type { PawapayDepositCallbackPayload } from "../../lib/pawapay/types";
import { verifyPawapaySignedCallback } from "../../lib/pawapay/signature";
import {
  completePawapayDepositTransaction,
  failPawapayDepositTransaction
} from "./complete-pawapay-deposit";
import type {
  InvoiceRepository,
  OrganizationPropertyUnitRepository,
  PawapayTransactionRepository,
  PaymentRepository,
  TenantLeaseRepository
} from "@hhousing/data-access";
import type { notifyPaidInvoice } from "../../lib/notifications/paid-invoice-notification";

export async function processPawapayDepositCallback(params: {
  request: Request;
  rawBody: string;
  pawapayTransactionRepository: PawapayTransactionRepository;
  paymentRepository: PaymentRepository;
  invoiceRepository: InvoiceRepository;
  tenantRepository: TenantLeaseRepository;
  organizationRepository?: OrganizationPropertyUnitRepository;
  notifyPaidInvoice?: typeof notifyPaidInvoice;
}): Promise<{ status: number; body: unknown }> {
  const config = readPawapayConfig();
  if (!config) {
    return {
      status: 500,
      body: { success: false, error: "PawaPay is not configured" }
    };
  }

  const signatureValid = await verifyPawapaySignedCallback(config, params.request, params.rawBody);
  if (!signatureValid) {
    return {
      status: 401,
      body: { success: false, error: "Invalid callback signature" }
    };
  }

  let payload: PawapayDepositCallbackPayload;
  try {
    payload = JSON.parse(params.rawBody) as PawapayDepositCallbackPayload;
  } catch {
    return {
      status: 400,
      body: { success: false, error: "Invalid JSON body" }
    };
  }

  const depositId = payload.data?.depositId ?? payload.depositId;
  const depositStatus = payload.data?.status ?? payload.status;
  const failureReason = payload.data?.failureReason ?? payload.failureReason;

  if (!depositId || !depositStatus) {
    return {
      status: 400,
      body: { success: false, error: "Missing depositId or status" }
    };
  }

  if (!isFinalPawapayDepositStatus(depositStatus)) {
    return {
      status: 200,
      body: { success: true, ignored: true }
    };
  }

  if (isSuccessfulPawapayDepositStatus(depositStatus)) {
    await completePawapayDepositTransaction({
      transactionId: depositId,
      pawapayStatus: depositStatus,
      pawapayTransactionRepository: params.pawapayTransactionRepository,
      paymentRepository: params.paymentRepository,
      invoiceRepository: params.invoiceRepository,
      tenantRepository: params.tenantRepository,
      organizationRepository: params.organizationRepository,
      notifyPaidInvoice: params.notifyPaidInvoice
    });
  } else {
    await failPawapayDepositTransaction({
      transactionId: depositId,
      pawapayStatus: depositStatus,
      failureCode: failureReason?.failureCode ?? null,
      failureMessage: failureReason?.failureMessage ?? null,
      pawapayTransactionRepository: params.pawapayTransactionRepository
    });
  }

  return {
    status: 200,
    body: { success: true }
  };
}

export async function refreshPawapayDepositTransactionStatus(params: {
  transactionId: string;
  pawapayTransactionRepository: PawapayTransactionRepository;
  paymentRepository: PaymentRepository;
  invoiceRepository: InvoiceRepository;
  tenantRepository: TenantLeaseRepository;
  organizationRepository?: OrganizationPropertyUnitRepository;
  notifyPaidInvoice?: typeof notifyPaidInvoice;
}): Promise<void> {
  const transaction = await params.pawapayTransactionRepository.getTransactionById(params.transactionId);
  if (!transaction || transaction.status === "completed" || transaction.status === "failed") {
    return;
  }

  const remoteStatus = await getPawapayDepositStatus(params.transactionId);
  if (!isFinalPawapayDepositStatus(remoteStatus.status)) {
    return;
  }

  if (isSuccessfulPawapayDepositStatus(remoteStatus.status)) {
    await completePawapayDepositTransaction({
      transactionId: params.transactionId,
      pawapayStatus: remoteStatus.status,
      pawapayTransactionRepository: params.pawapayTransactionRepository,
      paymentRepository: params.paymentRepository,
      invoiceRepository: params.invoiceRepository,
      tenantRepository: params.tenantRepository,
      organizationRepository: params.organizationRepository,
      notifyPaidInvoice: params.notifyPaidInvoice
    });
    return;
  }

  await failPawapayDepositTransaction({
    transactionId: params.transactionId,
    pawapayStatus: remoteStatus.status,
    failureCode: remoteStatus.failureReason?.failureCode ?? null,
    failureMessage: remoteStatus.failureReason?.failureMessage ?? null,
    pawapayTransactionRepository: params.pawapayTransactionRepository
  });
}

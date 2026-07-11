export type PawapayOperationType = "deposit" | "checkout" | "payout" | "refund";

export type PawapayTransactionStatus = "pending" | "submitted" | "completed" | "failed";

export type PawapayProviderCode =
  | "AIRTEL_COD"
  | "ORANGE_COD"
  | "VODACOM_MPESA_COD";

export interface PawapayTransactionAllocation {
  paymentId: string;
  amount: number;
}

export interface PawapayTransaction {
  id: string;
  organizationId: string;
  tenantId: string;
  leaseId: string;
  operationType: PawapayOperationType;
  totalAmount: number;
  currencyCode: string;
  provider: PawapayProviderCode;
  phoneNumber: string;
  pawapayStatus: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  status: PawapayTransactionStatus;
  allocations: PawapayTransactionAllocation[];
  createdAtIso: string;
  updatedAtIso: string;
  completedAtIso: string | null;
}

import type {
  PawapayOperationType,
  PawapayProviderCode,
  PawapayTransaction,
  PawapayTransactionAllocation,
  PawapayTransactionStatus
} from "@hhousing/domain";

export interface CreatePawapayTransactionInput {
  id: string;
  organizationId: string;
  tenantId: string;
  leaseId: string;
  operationType: PawapayOperationType;
  totalAmount: number;
  currencyCode: string;
  provider: PawapayProviderCode;
  phoneNumber: string;
  allocations: PawapayTransactionAllocation[];
}

export interface UpdatePawapayTransactionStatusInput {
  transactionId: string;
  status: PawapayTransactionStatus;
  pawapayStatus: string;
  failureCode?: string | null;
  failureMessage?: string | null;
}

export interface PawapayTransactionRepository {
  createTransaction(input: CreatePawapayTransactionInput): Promise<PawapayTransaction>;
  getTransactionById(transactionId: string): Promise<PawapayTransaction | null>;
  getTransactionByIdForTenant(
    transactionId: string,
    tenantAuthUserId: string,
    organizationId: string
  ): Promise<PawapayTransaction | null>;
  hasInFlightTransactionForTenant(tenantId: string, organizationId: string): Promise<boolean>;
  updateTransactionStatus(input: UpdatePawapayTransactionStatusInput): Promise<PawapayTransaction | null>;
}

import type { Invoice, InvoicePaymentApplication, LeaseCreditBalance } from "@hhousing/domain";
import type { ListInvoicesFilter } from "@hhousing/api-contracts";

export interface SyncInvoiceForPaidPaymentInput {
  organizationId: string;
  paymentId: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  currencyCode: string;
  dueDate: string;
  paidDate: string;
  period: string | null;
}

export interface SyncInvoiceForPaidPaymentOutput {
  invoice: Invoice;
  appliedAmount: number;
  creditCreatedAmount: number;
}

export interface InvoiceDetailRecord {
  invoice: Invoice;
  applications: InvoicePaymentApplication[];
  creditBalance: LeaseCreditBalance | null;
}

export interface InvoiceRepository {
  listInvoices(filter: ListInvoicesFilter): Promise<Invoice[]>;
  listLeaseCreditBalances(organizationId: string): Promise<LeaseCreditBalance[]>;
  getInvoiceById(invoiceId: string, organizationId: string): Promise<Invoice | null>;
  getInvoiceDetail(invoiceId: string, organizationId: string): Promise<InvoiceDetailRecord | null>;
  voidInvoice(invoiceId: string, organizationId: string, reason: string): Promise<{ invoice: Invoice; creditAdjustedAmount: number } | null>;
  syncInvoiceForPaidPayment(input: SyncInvoiceForPaidPaymentInput): Promise<SyncInvoiceForPaidPaymentOutput>;
  markInvoiceEmailSent(invoiceId: string, organizationId: string): Promise<void>;
  markInvoiceEmailFailed(invoiceId: string, organizationId: string, errorMessage: string): Promise<void>;
}

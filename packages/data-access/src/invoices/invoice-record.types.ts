import type { Invoice, InvoiceEmailJob, InvoicePaymentApplication, LeaseCreditBalance } from "@hhousing/domain";
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
  queuedEmailJob: boolean;
}

export interface QueueInvoiceEmailJobInput {
  id: string;
  organizationId: string;
  invoiceId: string;
  reason: "send" | "resend" | "auto_on_paid";
  maxAttempts?: number;
}

export interface InvoiceDetailRecord {
  invoice: Invoice;
  applications: InvoicePaymentApplication[];
  creditBalance: LeaseCreditBalance | null;
  emailJobs: InvoiceEmailJob[];
}

export interface ProcessableInvoiceEmailJob {
  job: InvoiceEmailJob;
  invoice: Invoice;
  tenantEmail: string;
  tenantFullName: string;
}

export interface InvoiceRepository {
  listInvoices(filter: ListInvoicesFilter): Promise<Invoice[]>;
  listLeaseCreditBalances(organizationId: string): Promise<LeaseCreditBalance[]>;
  getInvoiceById(invoiceId: string, organizationId: string): Promise<Invoice | null>;
  getInvoiceDetail(invoiceId: string, organizationId: string): Promise<InvoiceDetailRecord | null>;
  voidInvoice(invoiceId: string, organizationId: string, reason: string): Promise<{ invoice: Invoice; creditAdjustedAmount: number } | null>;
  queueInvoiceEmailJob(input: QueueInvoiceEmailJobInput): Promise<boolean>;
  syncInvoiceForPaidPayment(input: SyncInvoiceForPaidPaymentInput): Promise<SyncInvoiceForPaidPaymentOutput>;
  claimProcessableEmailJobs(limit: number): Promise<ProcessableInvoiceEmailJob[]>;
  markEmailJobSent(jobId: string, organizationId: string): Promise<void>;
  markEmailJobFailed(jobId: string, organizationId: string, errorMessage: string): Promise<void>;
  releaseProcessingEmailJob(jobId: string, organizationId: string): Promise<void>;
}

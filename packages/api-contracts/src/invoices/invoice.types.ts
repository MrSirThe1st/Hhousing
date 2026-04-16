import type { Invoice, InvoiceEmailJob, InvoicePaymentApplication, LeaseCreditBalance } from "@hhousing/domain";

export interface ListInvoicesFilter {
  organizationId: string;
  leaseId?: string;
  status?: "issued" | "partial" | "paid" | "void";
  emailStatus?: "not_sent" | "queued" | "sent" | "failed";
  year?: number;
}

export interface ListInvoicesOutput {
  invoices: Invoice[];
}

export interface GetInvoiceDetailOutput {
  invoice: Invoice;
  applications: InvoicePaymentApplication[];
  creditBalance: LeaseCreditBalance | null;
  emailJobs: InvoiceEmailJob[];
}

export interface QueueInvoiceEmailInput {
  invoiceId: string;
  organizationId: string;
  reason: "send" | "resend";
}

export interface QueueInvoiceEmailOutput {
  invoice: Invoice;
  queued: boolean;
}

export interface VoidInvoiceInput {
  invoiceId: string;
  organizationId: string;
  reason: string;
}

export interface VoidInvoiceOutput {
  invoice: Invoice;
  creditAdjustedAmount: number;
}

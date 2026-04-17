import type { Invoice, InvoicePaymentApplication, LeaseCreditBalance } from "@hhousing/domain";

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

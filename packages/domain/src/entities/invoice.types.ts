export type InvoiceType = "monthly" | "one_time";

export type InvoiceStatus = "issued" | "partial" | "paid" | "void";

export type InvoiceEmailStatus = "not_sent" | "queued" | "sent" | "failed";

export interface Invoice {
  id: string;
  organizationId: string;
  leaseId: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  invoiceYear: number;
  invoiceSequence: number;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  period: string | null;
  issueDate: string;
  dueDate: string;
  currencyCode: string;
  totalAmount: number;
  amountPaid: number;
  status: InvoiceStatus;
  paidAt: string | null;
  emailStatus: InvoiceEmailStatus;
  emailSentCount: number;
  lastEmailedAtIso: string | null;
  lastEmailError: string | null;
  voidReason: string | null;
  voidedAtIso: string | null;
  sourcePaymentId: string | null;
  createdAtIso: string;
}

export interface InvoicePaymentApplication {
  id: string;
  organizationId: string;
  invoiceId: string;
  paymentId: string;
  appliedAmount: number;
  appliedAtIso: string;
  createdAtIso: string;
}

export interface LeaseCreditBalance {
  id: string;
  organizationId: string;
  leaseId: string;
  currencyCode: string;
  creditAmount: number;
  updatedAtIso: string;
}

export type InvoiceEmailJobKind = "send" | "resend" | "auto_on_paid";

export type InvoiceEmailJobStatus = "queued" | "processing" | "sent" | "failed";

export interface InvoiceEmailJob {
  id: string;
  organizationId: string;
  invoiceId: string;
  jobKind: InvoiceEmailJobKind;
  status: InvoiceEmailJobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAtIso: string;
  lastError: string | null;
  lockedAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}

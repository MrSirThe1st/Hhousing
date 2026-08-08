export type PlatformSubscriptionInvoiceStatus = "issued" | "paid" | "void";

/** UI-facing status: overdue is derived from issued + past due. */
export type PlatformBillingDisplayStatus = "issued" | "paid" | "overdue" | "void";

export type PlatformSaasPaymentMethod = "orange" | "airtel" | "mpesa" | "other";

export interface PlatformBillingSettings {
  id: string;
  pricePerUnitAmount: number;
  currencyCode: string;
  freePropertyThreshold: number;
  updatedAtIso: string;
}

export interface PlatformSubscriptionInvoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  period: string;
  propertyCount: number;
  unitCount: number;
  pricePerUnitAmount: number;
  amountDue: number;
  currencyCode: string;
  status: PlatformSubscriptionInvoiceStatus;
  dueAtIso: string;
  issuedAtIso: string;
  paidAtIso: string | null;
  paidConfirmedByUserId: string | null;
  paymentReportedAtIso: string | null;
  paymentReportedByUserId: string | null;
  paymentMethod: PlatformSaasPaymentMethod | null;
  paymentNote: string | null;
  voidReason: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface OrganizationUsageSnapshot {
  organizationId: string;
  propertyCount: number;
  unitCount: number;
}

export interface PlatformBillingEstimate {
  organizationId: string;
  propertyCount: number;
  unitCount: number;
  pricePerUnitAmount: number;
  currencyCode: string;
  freePropertyThreshold: number;
  isFreeTier: boolean;
  amountDue: number;
}

export function resolvePlatformBillingDisplayStatus(
  invoice: Pick<PlatformSubscriptionInvoice, "status" | "dueAtIso">,
  nowMs: number = Date.now()
): PlatformBillingDisplayStatus {
  if (invoice.status === "paid") return "paid";
  if (invoice.status === "void") return "void";
  const due = new Date(invoice.dueAtIso).getTime();
  if (!Number.isNaN(due) && due < nowMs) return "overdue";
  return "issued";
}

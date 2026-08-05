export type PlatformPaymentProvider = "airtel" | "orange" | "mpesa" | "other";

export type PlatformSubscriptionInvoiceStatus =
  | "issued"
  | "pending_confirmation"
  | "paid"
  | "void";

export interface PlatformBillingSettings {
  id: string;
  pricePerUnitAmount: number;
  currencyCode: string;
  freePropertyThreshold: number;
  updatedAtIso: string;
}

export interface PlatformPaymentMethod {
  id: string;
  provider: PlatformPaymentProvider;
  displayName: string;
  accountNumber: string;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface PlatformSubscriptionInvoice {
  id: string;
  organizationId: string;
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

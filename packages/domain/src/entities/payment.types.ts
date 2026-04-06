export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";

export type PaymentKind = "rent" | "deposit" | "prorated_rent" | "fee" | "other";

export type PaymentBillingFrequency = "one_time" | "monthly" | "quarterly" | "annually";

export interface Payment {
  id: string;
  organizationId: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  currencyCode: string;
  dueDate: string;              // YYYY-MM-DD
  paidDate: string | null;
  status: PaymentStatus;
  note: string | null;
  paymentKind: PaymentKind;
  billingFrequency: PaymentBillingFrequency;
  sourceLeaseChargeTemplateId: string | null;
  isInitialCharge: boolean;
  chargePeriod: string | null;  // YYYY-MM, null for manual payments
  createdAtIso: string;
}

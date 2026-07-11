export type LeaseStatus = "active" | "ended" | "pending";

export type LeaseTermType = "fixed" | "month_to_month";

export type LeasePaymentFrequency = "monthly" | "quarterly" | "annually";

export type LeaseSigningMethod = "physical" | "scanned" | "email_confirmation";

export type LeaseMoveInMode = "standard" | "existing_tenant";

export type SkippableInitialChargeType = "deposit" | "first_rent" | "prorated_rent" | "fee" | "other";

export interface Lease {
  id: string;
  organizationId: string;
  unitId: string;
  tenantId: string;
  startDate: string;       // ISO date string YYYY-MM-DD
  endDate: string | null;  // null = open-ended
  monthlyRentAmount: number;
  currencyCode: string;
  termType: LeaseTermType;
  fixedTermMonths: number | null;
  autoRenewToMonthly: boolean;
  paymentFrequency: LeasePaymentFrequency;
  paymentStartDate: string;
  dueDayOfMonth: number;
  depositAmount: number;
  moveInMode: LeaseMoveInMode;
  depositSettledExternally: boolean;
  depositSettledNote: string | null;
  status: LeaseStatus;
  signedAt: string | null;
  signingMethod: LeaseSigningMethod | null;
  activatedAtIso: string | null;
  createdAtIso: string;
}

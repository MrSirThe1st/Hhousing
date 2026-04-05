export type LeaseStatus = "active" | "ended" | "pending";

export type LeaseTermType = "fixed" | "month_to_month";

export type LeasePaymentFrequency = "monthly" | "quarterly" | "annually";

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
  status: LeaseStatus;
  createdAtIso: string;
}

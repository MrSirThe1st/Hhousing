export type LeaseChargeType = "deposit" | "other";

export type LeaseChargeFrequency = "one_time" | "monthly" | "quarterly" | "annually";

export interface LeaseChargeTemplate {
  id: string;
  organizationId: string;
  leaseId: string;
  label: string;
  chargeType: LeaseChargeType;
  amount: number;
  currencyCode: string;
  frequency: LeaseChargeFrequency;
  startDate: string;
  endDate: string | null;
  createdAtIso: string;
}
export type LeaseStatus = "active" | "ended" | "pending";

export interface Lease {
  id: string;
  organizationId: string;
  unitId: string;
  tenantId: string;
  startDate: string;       // ISO date string YYYY-MM-DD
  endDate: string | null;  // null = open-ended
  monthlyRentAmount: number;
  currencyCode: string;
  status: LeaseStatus;
  createdAtIso: string;
}

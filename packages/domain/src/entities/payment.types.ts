export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";

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
  chargePeriod: string | null;  // YYYY-MM, null for manual payments
  createdAtIso: string;
}

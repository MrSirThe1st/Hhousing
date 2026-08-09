import type { Payment, PaymentBillingFrequency, PaymentKind, PropertyManagementContext } from "@hhousing/domain";
import type { ListPaymentsFilter } from "@hhousing/api-contracts";

export interface CreatePaymentRecordInput {
  id: string;
  organizationId: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  currencyCode: string;
  dueDate: string;
  note: string | null;
  paymentKind: PaymentKind;
  billingFrequency: PaymentBillingFrequency;
  sourceLeaseChargeTemplateId: string | null;
  isInitialCharge: boolean;
  status?: "pending" | "paid";
  paidDate?: string | null;
}

export interface MarkPaymentPaidRecordInput {
  paymentId: string;
  organizationId: string;
  paidDate: string;
}

export interface DashboardPaymentFinanceSnapshot {
  paidAmount: number;
  overdueAmount: number;
  overdueCount: number;
}

export interface DashboardWatchlistPaymentRow {
  id: string;
  status: "overdue" | "pending";
  amount: number;
  currencyCode: string;
  dueDate: string;
  tenantName: string;
  unitLabel: string;
}

export interface DashboardMonthlyTotalRow {
  month: string;
  amount: number;
}


export interface PaymentFinanceFilters {
  organizationId: string;
  from: string;
  to: string;
  propertyId?: string | null;
}

export interface PaymentCurrencyTotal {
  currencyCode: string;
  amount: number;
}

export interface PaymentPropertyAggregate {
  propertyId: string;
  propertyName: string;
  paymentCount: number;
  totals: PaymentCurrencyTotal[];
}

export interface PaymentMonthlyAggregate {
  month: string;
  totals: PaymentCurrencyTotal[];
}

export interface RevenueLedgerPageRow {
  paymentId: string;
  propertyId: string | null;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  paidDate: string;
  dueDate: string;
  paymentKind: import("@hhousing/domain").PaymentKind;
  currencyCode: string;
  amount: number;
  note: string | null;
}

export interface SumRevenuePaymentsResult {
  revenueTotals: PaymentCurrencyTotal[];
  depositLiabilityTotals: PaymentCurrencyTotal[];
  recordedPaymentCount: number;
  recordedDepositCount: number;
  propertyRevenue: PaymentPropertyAggregate[];
  monthlyRevenue: PaymentMonthlyAggregate[];
}

export interface ListRevenuePaymentsPageInput extends PaymentFinanceFilters {
  limit: number;
  cursor?: string | null;
}

export interface ListRevenuePaymentsPageResult {
  rows: RevenueLedgerPageRow[];
  nextCursor: string | null;
}

export interface ListPaymentsPageInput {
  organizationId: string;
  leaseId?: string | null;
  status?: string | null;
  limit: number;
  cursor?: string | null;
}

export interface ListPaymentsPageResult {
  payments: import("@hhousing/domain").Payment[];
  nextCursor: string | null;
}

export interface PaymentStatusCounts {
  total: number;
  pending: number;
  paid: number;
  overdue: number;
  cancelled: number;
}

export interface PaymentRepository {
  createPayment(input: CreatePaymentRecordInput): Promise<Payment>;
  markPaymentPaid(input: MarkPaymentPaidRecordInput): Promise<Payment | null>;
  listPayments(filter: ListPaymentsFilter & { limit?: number }): Promise<Payment[]>;
  listPaymentsPage(input: ListPaymentsPageInput): Promise<ListPaymentsPageResult>;
  getPaymentStatusCounts(organizationId: string): Promise<PaymentStatusCounts>;
  sumRevenuePayments(filters: PaymentFinanceFilters): Promise<SumRevenuePaymentsResult>;
  listRevenuePaymentsPage(input: ListRevenuePaymentsPageInput): Promise<ListRevenuePaymentsPageResult>;
  listPaymentsByOrganizationAndLeaseIds?(
    organizationId: string,
    leaseIds: string[]
  ): Promise<Payment[]>;
  listPaymentsByTenantAuthUserId(tenantAuthUserId: string, organizationId: string): Promise<Payment[]>;
  getPaymentById(paymentId: string, organizationId: string): Promise<Payment | null>;
  listOrganizationsWithActiveRecurringCharges(): Promise<string[]>;
  updateOverduePayments(organizationId: string): Promise<number>;
  generateMonthlyCharges(
    organizationId: string,
    period: string,
    managementContext?: PropertyManagementContext
  ): Promise<number>;
  getDashboardPaymentFinanceSnapshot(
    organizationId: string,
    currencyCode: string,
    monthStart: string,
    monthEndExclusive: string
  ): Promise<DashboardPaymentFinanceSnapshot>;
  listDashboardWatchlistPayments(
    organizationId: string,
    currencyCode: string,
    limit: number
  ): Promise<DashboardWatchlistPaymentRow[]>;
  sumPaidPaymentsByMonth(
    organizationId: string,
    currencyCode: string,
    fromDate: string
  ): Promise<DashboardMonthlyTotalRow[]>;
  countSidebarPaymentBadges(organizationId: string, todayIsoDate: string): Promise<number>;
}

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
}

export interface MarkPaymentPaidRecordInput {
  paymentId: string;
  organizationId: string;
  paidDate: string;
}

export interface PaymentRepository {
  createPayment(input: CreatePaymentRecordInput): Promise<Payment>;
  markPaymentPaid(input: MarkPaymentPaidRecordInput): Promise<Payment | null>;
  listPayments(filter: ListPaymentsFilter): Promise<Payment[]>;
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
}

import type { Payment } from "@hhousing/domain";
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
}

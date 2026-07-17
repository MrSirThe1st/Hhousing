import type { Payment, PaymentBillingFrequency, PaymentKind } from "@hhousing/domain";

export interface CreatePaymentInput {
  organizationId: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  currencyCode: string;
  dueDate: string;
  note: string | null;
  paymentKind?: PaymentKind;
  billingFrequency?: PaymentBillingFrequency;
  sourceLeaseChargeTemplateId?: string | null;
  isInitialCharge?: boolean;
}

export type CreatePaymentOutput = Payment;

export interface MarkPaymentPaidInput {
  paymentId: string;
  organizationId: string;
  paidDate: string;
}

export type MarkPaymentPaidOutput = Payment;

export interface ListPaymentsFilter {
  organizationId: string;
  leaseId?: string;
  status?: string;
}

export interface ListPaymentsOutput {
  payments: Payment[];
}

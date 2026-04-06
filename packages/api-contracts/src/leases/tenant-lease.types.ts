import type { Lease, LeaseChargeFrequency, LeaseChargeType, LeasePaymentFrequency, LeaseTermType, LeaseSigningMethod, Tenant } from "@hhousing/domain";

export interface CreateTenantInput {
  organizationId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth?: string | null;
  photoUrl?: string | null;
}

export type CreateTenantOutput = Tenant;

export interface CreateLeaseChargeInput {
  label: string;
  chargeType: LeaseChargeType;
  amount: number;
  currencyCode: string;
  frequency: LeaseChargeFrequency;
  startDate: string;
  endDate?: string | null;
}

export interface CreateLeaseInput {
  organizationId: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string | null;
  monthlyRentAmount: number;
  currencyCode: string;
  termType?: LeaseTermType;
  fixedTermMonths?: number | null;
  autoRenewToMonthly?: boolean;
  paymentFrequency?: LeasePaymentFrequency;
  paymentStartDate?: string;
  dueDayOfMonth?: number;
  charges?: CreateLeaseChargeInput[];
}

export interface FinalizeLeaseInput {
  organizationId: string;
  signedAt: string;
  signingMethod: LeaseSigningMethod;
}

export type CreateLeaseOutput = Lease;

export interface LeaseWithTenantView extends Lease {
  tenantFullName: string;
  tenantEmail: string | null;
}

export interface ListLeasesOutput {
  leases: LeaseWithTenantView[];
}

export interface ListTenantsOutput {
  tenants: Tenant[];
}

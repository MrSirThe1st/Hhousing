import type { Tenant } from "@hhousing/domain";
import type { Lease } from "@hhousing/domain";

export interface CreateTenantInput {
  organizationId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export type CreateTenantOutput = Tenant;

export interface CreateLeaseInput {
  organizationId: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string | null;
  monthlyRentAmount: number;
  currencyCode: string;
}

export type CreateLeaseOutput = Lease;

export interface LeaseWithTenantView extends Lease {
  tenantFullName: string;
  tenantEmail: string | null;
}

export interface ListLeasesOutput {
  leases: LeaseWithTenantView[];
}

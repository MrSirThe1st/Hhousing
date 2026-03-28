import type { Tenant, Lease } from "@hhousing/domain";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";

export interface CreateTenantRecordInput {
  id: string;
  organizationId: string;
  authUserId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface CreateLeaseRecordInput {
  id: string;
  organizationId: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string | null;
  monthlyRentAmount: number;
  currencyCode: string;
}

export interface TenantLeaseRepository {
  createTenant(input: CreateTenantRecordInput): Promise<Tenant>;
  createLease(input: CreateLeaseRecordInput): Promise<Lease>;
  listLeasesByOrganization(organizationId: string): Promise<LeaseWithTenantView[]>;
  listTenantsByOrganization(organizationId: string): Promise<Tenant[]>;
}

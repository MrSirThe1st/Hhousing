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

export interface UpdateTenantRecordInput {
  id: string;
  organizationId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface UpdateLeaseRecordInput {
  id: string;
  organizationId: string;
  endDate: string | null;
  status: "active" | "ended" | "pending";
}

export interface TenantLeaseRepository {
  createTenant(input: CreateTenantRecordInput): Promise<Tenant>;
  createLease(input: CreateLeaseRecordInput): Promise<Lease>;
  listLeasesByOrganization(organizationId: string): Promise<LeaseWithTenantView[]>;
  listTenantsByOrganization(organizationId: string): Promise<Tenant[]>;
  getTenantById(tenantId: string, organizationId: string): Promise<Tenant | null>;
  getLeaseById(leaseId: string, organizationId: string): Promise<LeaseWithTenantView | null>;
  updateTenant(input: UpdateTenantRecordInput): Promise<Tenant | null>;
  updateLease(input: UpdateLeaseRecordInput): Promise<Lease | null>;
  deleteTenant(tenantId: string, organizationId: string): Promise<boolean>;
}

import type { Tenant, Lease } from "@hhousing/domain";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";

export interface CreateTenantInvitationRecordInput {
  id: string;
  tenantId: string;
  organizationId: string;
  email: string;
  tokenHash: string;
  expiresAtIso: string;
  createdByUserId: string;
}

export interface TenantInvitationRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  email: string;
  expiresAtIso: string;
  usedAtIso: string | null;
  revokedAtIso: string | null;
  createdAtIso: string;
}

export interface TenantInvitationPreviewRecord {
  invitationId: string;
  tenantId: string;
  organizationId: string;
  organizationName: string;
  tenantFullName: string;
  tenantEmail: string;
  tenantPhone: string | null;
  leaseId: string | null;
  unitId: string | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  monthlyRentAmount: number | null;
  currencyCode: string | null;
  expiresAtIso: string;
}

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
  revokeActiveTenantInvitations(tenantId: string, organizationId: string): Promise<void>;
  createTenantInvitation(input: CreateTenantInvitationRecordInput): Promise<TenantInvitationRecord>;
  getTenantInvitationPreviewByTokenHash(tokenHash: string): Promise<TenantInvitationPreviewRecord | null>;
  markTenantInvitationUsed(invitationId: string): Promise<void>;
  linkTenantAuthUser(
    tenantId: string,
    organizationId: string,
    authUserId: string,
    phone: string | null
  ): Promise<Tenant | null>;
  listLeasesByOrganization(organizationId: string): Promise<LeaseWithTenantView[]>;
  getCurrentLeaseByTenantAuthUserId(
    tenantAuthUserId: string,
    organizationId: string
  ): Promise<LeaseWithTenantView | null>;
  listTenantsByOrganization(organizationId: string): Promise<Tenant[]>;
  getTenantById(tenantId: string, organizationId: string): Promise<Tenant | null>;
  getLeaseById(leaseId: string, organizationId: string): Promise<LeaseWithTenantView | null>;
  updateTenant(input: UpdateTenantRecordInput): Promise<Tenant | null>;
  updateLease(input: UpdateLeaseRecordInput): Promise<Lease | null>;
  deleteTenant(tenantId: string, organizationId: string): Promise<boolean>;
}

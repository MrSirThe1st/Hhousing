import type { Lease, LeaseChargeFrequency, LeaseChargeType, LeaseSigningMethod, MoveOut, MoveOutCharge, MoveOutInspection, Tenant } from "@hhousing/domain";
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
  dateOfBirth: string | null;
  photoUrl: string | null;
  employmentStatus: string | null;
  jobTitle: string | null;
  monthlyIncome: number | null;
  numberOfOccupants: number | null;
}

export interface CreateLeaseChargeRecordInput {
  id: string;
  organizationId: string;
  label: string;
  chargeType: LeaseChargeType;
  amount: number;
  currencyCode: string;
  frequency: LeaseChargeFrequency;
  startDate: string;
  endDate: string | null;
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
  termType: "fixed" | "month_to_month";
  fixedTermMonths: number | null;
  autoRenewToMonthly: boolean;
  paymentFrequency: "monthly" | "quarterly" | "annually";
  paymentStartDate: string;
  dueDayOfMonth: number;
  depositAmount: number;
  status: "active" | "ended" | "pending";
  charges: CreateLeaseChargeRecordInput[];
}

export interface UpdateTenantRecordInput {
  id: string;
  organizationId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  photoUrl: string | null;
  employmentStatus: string | null;
  jobTitle: string | null;
  monthlyIncome: number | null;
  numberOfOccupants: number | null;
}

export interface UpdateLeaseRecordInput {
  id: string;
  organizationId: string;
  endDate: string | null;
  status: "active" | "ended" | "pending";
  signedAt?: string | null;
  signingMethod?: LeaseSigningMethod | null;
}

export interface UpsertMoveOutRecordInput {
  id: string;
  organizationId: string;
  leaseId: string;
  initiatedByUserId: string | null;
  moveOutDate: string;
  reason: string | null;
  status: "draft" | "confirmed";
}

export interface ReplaceMoveOutChargeRecordInput {
  moveOutId: string;
  organizationId: string;
  charges: Array<{
    id: string;
    chargeType: "unpaid_rent" | "prorated_rent" | "fee" | "damage" | "cleaning" | "penalty" | "deposit_deduction" | "credit";
    amount: number;
    currencyCode: string;
    note: string | null;
    sourceReferenceType: string | null;
    sourceReferenceId: string | null;
  }>;
}

export interface UpsertMoveOutInspectionRecordInput {
  id: string;
  moveOutId: string;
  organizationId: string;
  checklistSnapshot: Array<{
    id: string;
    label: string;
    isChecked: boolean;
    note: string | null;
  }>;
  notes: string | null;
  photoDocumentIds: string[];
  inspectedAtIso: string | null;
}

export interface CloseMoveOutRecordInput {
  moveOutId: string;
  organizationId: string;
  closureLedgerEventId: number;
  finalizedStatementSnapshot: unknown;
  finalizedStatementHash: string;
}

export interface MoveOutAggregateRecord {
  moveOut: MoveOut;
  charges: MoveOutCharge[];
  inspection: MoveOutInspection | null;
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
  getMoveOutByLeaseId(leaseId: string, organizationId: string): Promise<MoveOutAggregateRecord | null>;
  upsertMoveOut(input: UpsertMoveOutRecordInput): Promise<MoveOut>;
  replaceMoveOutCharges(input: ReplaceMoveOutChargeRecordInput): Promise<MoveOutCharge[]>;
  upsertMoveOutInspection(input: UpsertMoveOutInspectionRecordInput): Promise<MoveOutInspection>;
  closeMoveOut(input: CloseMoveOutRecordInput): Promise<MoveOut | null>;
  updateTenant(input: UpdateTenantRecordInput): Promise<Tenant | null>;
  updateLease(input: UpdateLeaseRecordInput): Promise<Lease | null>;
  deleteTenant(tenantId: string, organizationId: string): Promise<boolean>;
}

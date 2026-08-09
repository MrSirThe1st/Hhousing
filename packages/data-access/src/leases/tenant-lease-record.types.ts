import type { Lease, LeaseChargeFrequency, LeaseChargeType, LeaseSigningMethod, LeaseMoveInMode, MoveOut, MoveOutCharge, MoveOutInspection, Tenant } from "@hhousing/domain";
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
  moveInMode: LeaseMoveInMode;
  depositSettledExternally: boolean;
  depositSettledNote: string | null;
  status: "active" | "ended" | "pending";
  signedAt?: string | null;
  signingMethod?: LeaseSigningMethod | null;
  charges: CreateLeaseChargeRecordInput[];
}

export interface UpdateTenantMobileProfileInput {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string | null;
  whatsappOptIn: boolean;
  whatsappNumber: string | null;
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

export interface CreateSimpleMoveOutRecordInput {
  id: string;
  organizationId: string;
  leaseId: string;
  initiatedByUserId: string | null;
  leaseEndDate: string;
  departureEffectiveDate: string;
  endedBy: "tenant" | "landlord";
  reasonCode: string | null;
  reasonNote: string | null;
  status: "planned" | "completed";
  depositHeldAmount: number;
  depositAmountOverridden: boolean;
  depositDisposition: "full_refund" | "partial_retention" | "full_retention";
  depositRetentionAmount: number;
  depositRetentionReasonCode: string | null;
  depositRetentionNote: string | null;
  depositRefundAmount: number;
  currencyCode: string;
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

export interface MoveOutListItem {
  moveOutId: string;
  leaseId: string;
  moveOutDate: string;
  departureEffectiveDate: string;
  leaseEndDate: string;
  reason: string | null;
  status: MoveOut["status"];
  depositRefundAmount: number | null;
  currencyCode: string | null;
  tenantFullName: string;
  propertyName: string | null;
  unitLabel: string | null;
  updatedAtIso: string;
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
  listLeasesByOrganization(organizationId: string, options?: { limit?: number }): Promise<LeaseWithTenantView[]>;
  listLeasesPage(input: {
    organizationId: string;
    status?: string | null;
    limit: number;
    cursor?: string | null;
  }): Promise<{ leases: LeaseWithTenantView[]; nextCursor: string | null }>;
  getLeaseStatusCounts(organizationId: string): Promise<{
    total: number;
    active: number;
    pending: number;
    ended: number;
  }>;
  listLeasesByOrganizationAndUnitIds?(
    organizationId: string,
    unitIds: string[]
  ): Promise<LeaseWithTenantView[]>;
  getDashboardLeaseSnapshot(
    organizationId: string,
    todayIsoDate: string,
    withinDays: number,
    limit: number
  ): Promise<{
    activeTenantCount: number;
    endingSoonCount: number;
    nextEndDate: string | null;
    endingSoon: Array<{
      id: string;
      tenantFullName: string;
      endDate: string;
      daysUntil: number;
    }>;
  }>;
  getCurrentLeaseByTenantAuthUserId(
    tenantAuthUserId: string,
    organizationId: string
  ): Promise<LeaseWithTenantView | null>;
  listTenantsByOrganization(organizationId: string): Promise<Tenant[]>;
  /** Tenant ids with an active or pending lease — cheap badge for list UIs. */
  listTenantIdsWithCurrentLeases(organizationId: string): Promise<string[]>;
  getTenantById(tenantId: string, organizationId: string): Promise<Tenant | null>;
  findTenantByNormalizedPhone(phoneNormalized: string): Promise<Tenant | null>;
  findTenantByEmail(email: string): Promise<Tenant | null>;
  getLeaseById(leaseId: string, organizationId: string): Promise<LeaseWithTenantView | null>;
  listMoveOutsByOrganization(organizationId: string): Promise<MoveOutListItem[]>;
  getLatestLedgerEventId(organizationId: string): Promise<number | null>;
  getMoveOutByLeaseId(leaseId: string, organizationId: string): Promise<MoveOutAggregateRecord | null>;
  upsertMoveOut(input: UpsertMoveOutRecordInput): Promise<MoveOut>;
  createSimpleMoveOut(input: CreateSimpleMoveOutRecordInput): Promise<MoveOut>;
  applyMoveOutDeparture(input: {
    moveOutId: string;
    organizationId: string;
    leaseId: string;
  }): Promise<MoveOut | null>;
  cancelMoveOut(input: {
    moveOutId: string;
    organizationId: string;
  }): Promise<MoveOut | null>;
  applyDueMoveOutsForOrganization(organizationId: string, todayIsoDate: string): Promise<number>;
  replaceMoveOutCharges(input: ReplaceMoveOutChargeRecordInput): Promise<MoveOutCharge[]>;
  upsertMoveOutInspection(input: UpsertMoveOutInspectionRecordInput): Promise<MoveOutInspection>;
  closeMoveOut(input: CloseMoveOutRecordInput): Promise<MoveOut | null>;
  updateTenant(input: UpdateTenantRecordInput): Promise<Tenant | null>;
  updateTenantMobileProfile(input: UpdateTenantMobileProfileInput): Promise<Tenant | null>;
  updateLease(input: UpdateLeaseRecordInput): Promise<Lease | null>;
  deleteTenant(tenantId: string, organizationId: string): Promise<boolean>;
  getTenantByAuthUserId(authUserId: string): Promise<Tenant | null>;
  requestTenantAccountDeletion(
    tenantId: string,
    organizationId: string
  ): Promise<Tenant | null>;
  cancelTenantAccountDeletion(
    tenantId: string,
    organizationId: string
  ): Promise<Tenant | null>;
  listTenantsPendingFinalization(cutoffIso: string): Promise<Tenant[]>;
  listTenantsNeedingDeletionReminder(
    reminderBeforeIso: string,
    finalizeBeforeIso: string
  ): Promise<Tenant[]>;
  markTenantDeletionReminderSent(
    tenantId: string,
    organizationId: string
  ): Promise<void>;
  finalizeTenantAccountDeletion(input: {
    tenantId: string;
    organizationId: string;
    emailHash: string | null;
    phoneHash: string | null;
    anonymizedFullName: string;
  }): Promise<{ authUserId: string | null; phoneNormalized: string | null } | null>;
}

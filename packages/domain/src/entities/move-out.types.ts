export type MoveOutStatus =
  | "draft"
  | "confirmed"
  | "closed"
  | "planned"
  | "completed"
  | "cancelled";

export type MoveOutEndedBy = "tenant" | "landlord";

export type MoveOutDepositDisposition = "full_refund" | "partial_retention" | "full_retention";

export type MoveOutReasonCode =
  | "end_of_lease"
  | "early_departure"
  | "tenant_termination"
  | "landlord_termination"
  | "other";

export type MoveOutRetentionReasonCode =
  | "damage"
  | "unpaid_rent"
  | "cleaning"
  | "other";

/** @deprecated Legacy accounting charge lines — unused by V1 Fin de location. */
export type MoveOutChargeType =
  | "unpaid_rent"
  | "prorated_rent"
  | "fee"
  | "damage"
  | "cleaning"
  | "penalty"
  | "deposit_deduction"
  | "credit";

/** @deprecated Legacy inspection checklist — unused by V1 Fin de location. */
export interface MoveOutInspectionChecklistItem {
  id: string;
  label: string;
  isChecked: boolean;
  note: string | null;
}

export interface MoveOut {
  id: string;
  organizationId: string;
  leaseId: string;
  initiatedByUserId: string | null;
  /** Synced to departureEffectiveDate for legacy list compatibility. */
  moveOutDate: string;
  leaseEndDate: string;
  departureEffectiveDate: string;
  endedBy: MoveOutEndedBy | null;
  reasonCode: MoveOutReasonCode | null;
  reasonNote: string | null;
  /** Legacy free-text reason (kept for old rows). */
  reason: string | null;
  status: MoveOutStatus;
  depositHeldAmount: number | null;
  depositAmountOverridden: boolean;
  depositDisposition: MoveOutDepositDisposition | null;
  depositRetentionAmount: number;
  depositRetentionReasonCode: MoveOutRetentionReasonCode | null;
  depositRetentionNote: string | null;
  depositRefundAmount: number | null;
  currencyCode: string | null;
  closureLedgerEventId: number | null;
  finalizedStatementSnapshot: unknown | null;
  finalizedStatementHash: string | null;
  confirmedAtIso: string | null;
  closedAtIso: string | null;
  completedAtIso: string | null;
  cancelledAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}

/** @deprecated Unused by V1 Fin de location. */
export interface MoveOutCharge {
  id: string;
  moveOutId: string;
  organizationId: string;
  chargeType: MoveOutChargeType;
  amount: number;
  currencyCode: string;
  note: string | null;
  sourceReferenceType: string | null;
  sourceReferenceId: string | null;
  createdAtIso: string;
}

/** @deprecated Unused by V1 Fin de location. */
export interface MoveOutInspection {
  id: string;
  moveOutId: string;
  organizationId: string;
  checklistSnapshot: MoveOutInspectionChecklistItem[];
  notes: string | null;
  photoDocumentIds: string[];
  inspectedAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}

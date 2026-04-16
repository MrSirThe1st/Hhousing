export type MoveOutStatus = "draft" | "confirmed" | "closed";

export type MoveOutChargeType = "unpaid_rent" | "prorated_rent" | "fee" | "damage" | "cleaning" | "penalty" | "deposit_deduction" | "credit";

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
  moveOutDate: string;
  reason: string | null;
  status: MoveOutStatus;
  closureLedgerEventId: number | null;
  finalizedStatementSnapshot: unknown | null;
  finalizedStatementHash: string | null;
  confirmedAtIso: string | null;
  closedAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}

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
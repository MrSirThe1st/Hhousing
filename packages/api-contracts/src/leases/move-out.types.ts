import type {
  MoveOut,
  MoveOutCharge,
  MoveOutChargeType,
  MoveOutInspection,
  MoveOutInspectionChecklistItem,
  MoveOutStatus
} from "@hhousing/domain";

export interface UpsertMoveOutChargeInput {
  chargeType: MoveOutChargeType;
  amount: number;
  currencyCode: string;
  note?: string | null;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
}

export interface UpsertMoveOutInput {
  moveOutDate: string;
  reason?: string | null;
  status?: Extract<MoveOutStatus, "draft" | "confirmed">;
  charges?: UpsertMoveOutChargeInput[];
}

export interface UpsertMoveOutInspectionInput {
  checklistSnapshot: MoveOutInspectionChecklistItem[];
  notes?: string | null;
  photoDocumentIds?: string[];
  inspectedAt?: string | null;
}

export interface CloseMoveOutInput {
  closureLedgerEventId: number;
}

export interface MoveOutSettlementSummary {
  currencyCode: string;
  outstandingAmount: number;
  futureScheduledAmount: number;
  depositHeldAmount: number;
  manualChargeAmount: number;
  manualCreditAmount: number;
  depositDeductionAmount: number;
  projectedTenantBalanceBeforeDeposit: number;
  projectedDepositRefundAmount: number;
}

export type MoveOutReconciliationSeverity = "blocking" | "drift_anomaly" | "warning";

export interface MoveOutReconciliationIssue {
  severity: MoveOutReconciliationSeverity;
  code: string;
  message: string;
}

export interface LeaseMoveOutView {
  moveOut: MoveOut;
  charges: MoveOutCharge[];
  inspection: MoveOutInspection | null;
  summary: MoveOutSettlementSummary;
}

export interface GetLeaseMoveOutOutput {
  moveOut: LeaseMoveOutView | null;
  summary: MoveOutSettlementSummary;
}

export interface GetMoveOutReconciliationOutput {
  moveOutStatus: MoveOutStatus | "not_started";
  issueCount: number;
  issues: MoveOutReconciliationIssue[];
}

export type UpsertMoveOutOutput = LeaseMoveOutView;
export type UpsertMoveOutInspectionOutput = MoveOutInspection;
export type CloseMoveOutOutput = LeaseMoveOutView;
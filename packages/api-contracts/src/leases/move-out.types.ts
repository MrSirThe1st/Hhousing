import type {
  MoveOut,
  MoveOutDepositDisposition,
  MoveOutEndedBy,
  MoveOutReasonCode,
  MoveOutRetentionReasonCode
} from "@hhousing/domain";

export interface CreateMoveOutInput {
  departureEffectiveDate: string;
  leaseEndDate: string;
  endedBy: MoveOutEndedBy;
  reasonCode?: MoveOutReasonCode | null;
  reasonNote?: string | null;
  depositHeldAmount: number;
  depositAmountOverridden: boolean;
  depositDisposition: MoveOutDepositDisposition;
  depositRetentionAmount: number;
  depositRetentionReasonCode?: MoveOutRetentionReasonCode | null;
  depositRetentionNote?: string | null;
  currencyCode: string;
}

export interface MoveOutDepositContext {
  currencyCode: string;
  paidDepositAmount: number;
  leaseDepositAmount: number;
  /** Suggested base: paid if > 0, else lease amount. */
  suggestedHeldAmount: number;
  equivalentMonths: number | null;
}

export interface LeaseMoveOutView {
  moveOut: MoveOut;
  depositContext: MoveOutDepositContext;
}

export interface GetLeaseMoveOutOutput {
  moveOut: MoveOut | null;
  depositContext: MoveOutDepositContext;
}

export type CreateMoveOutOutput = LeaseMoveOutView;

export interface MoveOutListItemView {
  moveOutId: string;
  leaseId: string;
  status: MoveOut["status"];
  departureEffectiveDate: string;
  leaseEndDate: string;
  depositRefundAmount: number | null;
  currencyCode: string | null;
  tenantFullName: string;
  propertyName: string;
  unitNumber: string;
}

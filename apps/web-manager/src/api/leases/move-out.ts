import type {
  CloseMoveOutInput,
  GetMoveOutReconciliationOutput,
  LeaseMoveOutView,
  MoveOutReconciliationIssue,
  MoveOutSettlementSummary,
  UpsertMoveOutInput,
  UpsertMoveOutInspectionInput
} from "@hhousing/api-contracts";
import type { PaymentRepository, TenantLeaseRepository } from "@hhousing/data-access";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Payment } from "@hhousing/domain";
import { createHash } from "node:crypto";

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildMoveOutSettlementSummary(
  lease: LeaseWithTenantView,
  payments: Payment[],
  moveOutView: LeaseMoveOutView | null
): MoveOutSettlementSummary {
  const referenceDate = moveOutView?.moveOut.moveOutDate ?? lease.endDate ?? getTodayIsoDate();
  let outstandingAmount = 0;
  let futureScheduledAmount = 0;
  let depositHeldAmount = 0;

  for (const payment of payments) {
    if (payment.status === "cancelled") {
      continue;
    }

    if (payment.paymentKind === "deposit") {
      if (payment.status === "paid") {
        depositHeldAmount += payment.amount;
      }
      continue;
    }

    if ((payment.status === "pending" || payment.status === "overdue") && payment.dueDate <= referenceDate) {
      outstandingAmount += payment.amount;
      continue;
    }

    if ((payment.status === "pending" || payment.status === "overdue") && payment.dueDate > referenceDate) {
      futureScheduledAmount += payment.amount;
    }
  }

  const chargeTotals = (moveOutView?.charges ?? []).reduce(
    (totals, charge) => {
      if (charge.chargeType === "credit") {
        totals.manualCreditAmount += charge.amount;
      } else if (charge.chargeType === "deposit_deduction") {
        totals.depositDeductionAmount += charge.amount;
      } else {
        totals.manualChargeAmount += charge.amount;
      }

      return totals;
    },
    { manualChargeAmount: 0, manualCreditAmount: 0, depositDeductionAmount: 0 }
  );

  const projectedTenantBalanceBeforeDeposit = outstandingAmount + chargeTotals.manualChargeAmount - chargeTotals.manualCreditAmount;
  const projectedDepositRefundAmount = Math.max(depositHeldAmount - chargeTotals.depositDeductionAmount, 0);

  return {
    currencyCode: lease.currencyCode,
    outstandingAmount,
    futureScheduledAmount,
    depositHeldAmount,
    manualChargeAmount: chargeTotals.manualChargeAmount,
    manualCreditAmount: chargeTotals.manualCreditAmount,
    depositDeductionAmount: chargeTotals.depositDeductionAmount,
    projectedTenantBalanceBeforeDeposit,
    projectedDepositRefundAmount
  };
}

export async function buildLeaseMoveOutView(
  lease: LeaseWithTenantView,
  repository: TenantLeaseRepository,
  paymentRepository: PaymentRepository
): Promise<{ moveOut: LeaseMoveOutView | null; summary: MoveOutSettlementSummary }> {
  const [moveOutAggregate, payments] = await Promise.all([
    repository.getMoveOutByLeaseId(lease.id, lease.organizationId),
    paymentRepository.listPayments({ organizationId: lease.organizationId, leaseId: lease.id })
  ]);

  const moveOut = moveOutAggregate
    ? {
      moveOut: moveOutAggregate.moveOut,
      charges: moveOutAggregate.charges,
      inspection: moveOutAggregate.inspection,
      summary: buildMoveOutSettlementSummary(lease, payments, {
        moveOut: moveOutAggregate.moveOut,
        charges: moveOutAggregate.charges,
        inspection: moveOutAggregate.inspection,
        summary: {
          currencyCode: lease.currencyCode,
          outstandingAmount: 0,
          futureScheduledAmount: 0,
          depositHeldAmount: 0,
          manualChargeAmount: 0,
          manualCreditAmount: 0,
          depositDeductionAmount: 0,
          projectedTenantBalanceBeforeDeposit: 0,
          projectedDepositRefundAmount: 0
        }
      })
    }
    : null;

  return {
    moveOut,
    summary: buildMoveOutSettlementSummary(lease, payments, moveOut)
  };
}

export async function upsertLeaseMoveOut(
  lease: LeaseWithTenantView,
  input: UpsertMoveOutInput,
  initiatedByUserId: string,
  repository: TenantLeaseRepository,
  createId: (prefix: string) => string
): Promise<void> {
  const existing = await repository.getMoveOutByLeaseId(lease.id, lease.organizationId);

  if (existing?.moveOut.status === "closed") {
    throw new Error("MOVE_OUT_ALREADY_CLOSED");
  }

  const moveOut = await repository.upsertMoveOut({
    id: existing?.moveOut.id ?? createId("mvo"),
    organizationId: lease.organizationId,
    leaseId: lease.id,
    initiatedByUserId,
    moveOutDate: input.moveOutDate,
    reason: input.reason ?? null,
    status: input.status ?? "draft"
  });

  await repository.replaceMoveOutCharges({
    moveOutId: moveOut.id,
    organizationId: lease.organizationId,
    charges: (input.charges ?? []).map((charge) => ({
      id: createId("mch"),
      chargeType: charge.chargeType,
      amount: charge.amount,
      currencyCode: charge.currencyCode,
      note: charge.note ?? null,
      sourceReferenceType: charge.sourceReferenceType ?? null,
      sourceReferenceId: charge.sourceReferenceId ?? null
    }))
  });
}

export async function upsertLeaseMoveOutInspection(
  lease: LeaseWithTenantView,
  input: UpsertMoveOutInspectionInput,
  repository: TenantLeaseRepository,
  createId: (prefix: string) => string
): Promise<void> {
  const existing = await repository.getMoveOutByLeaseId(lease.id, lease.organizationId);

  if (!existing) {
    throw new Error("MOVE_OUT_NOT_STARTED");
  }

  if (existing.moveOut.status === "closed") {
    throw new Error("MOVE_OUT_ALREADY_CLOSED");
  }

  await repository.upsertMoveOutInspection({
    id: existing.inspection?.id ?? createId("min"),
    moveOutId: existing.moveOut.id,
    organizationId: lease.organizationId,
    checklistSnapshot: input.checklistSnapshot,
    notes: input.notes ?? null,
    photoDocumentIds: input.photoDocumentIds ?? [],
    inspectedAtIso: input.inspectedAt ?? null
  });
}

export async function closeLeaseMoveOut(
  lease: LeaseWithTenantView,
  input: CloseMoveOutInput,
  repository: TenantLeaseRepository,
  paymentRepository: PaymentRepository
): Promise<void> {
  const existing = await repository.getMoveOutByLeaseId(lease.id, lease.organizationId);

  if (!existing) {
    throw new Error("MOVE_OUT_NOT_STARTED");
  }

  if (existing.moveOut.status === "closed") {
    throw new Error("MOVE_OUT_ALREADY_CLOSED");
  }

  if (existing.moveOut.status !== "confirmed") {
    throw new Error("MOVE_OUT_NOT_CONFIRMED");
  }

  const payments = await paymentRepository.listPayments({ organizationId: lease.organizationId, leaseId: lease.id });
  const summary = buildMoveOutSettlementSummary(lease, payments, {
    moveOut: existing.moveOut,
    charges: existing.charges,
    inspection: existing.inspection,
    summary: {
      currencyCode: lease.currencyCode,
      outstandingAmount: 0,
      futureScheduledAmount: 0,
      depositHeldAmount: 0,
      manualChargeAmount: 0,
      manualCreditAmount: 0,
      depositDeductionAmount: 0,
      projectedTenantBalanceBeforeDeposit: 0,
      projectedDepositRefundAmount: 0
    }
  });

  const closedAtIso = new Date().toISOString();
  const finalizedStatementSnapshot = {
    moveOut: existing.moveOut,
    charges: existing.charges,
    inspection: existing.inspection,
    summary,
    closureLedgerEventId: input.closureLedgerEventId,
    closedAtIso
  };
  const finalizedStatementHash = createHash("sha256")
    .update(JSON.stringify(finalizedStatementSnapshot))
    .digest("hex");

  const closed = await repository.closeMoveOut({
    moveOutId: existing.moveOut.id,
    organizationId: lease.organizationId,
    closureLedgerEventId: input.closureLedgerEventId,
    finalizedStatementSnapshot,
    finalizedStatementHash
  });

  if (!closed) {
    throw new Error("MOVE_OUT_NOT_CONFIRMED");
  }
}

function extractSnapshotSummary(snapshot: unknown): MoveOutSettlementSummary | null {
  if (typeof snapshot !== "object" || snapshot === null) {
    return null;
  }

  const summary = (snapshot as { summary?: unknown }).summary;
  if (typeof summary !== "object" || summary === null) {
    return null;
  }

  const candidate = summary as Partial<MoveOutSettlementSummary>;
  if (
    typeof candidate.currencyCode !== "string"
    || typeof candidate.outstandingAmount !== "number"
    || typeof candidate.futureScheduledAmount !== "number"
    || typeof candidate.depositHeldAmount !== "number"
    || typeof candidate.manualChargeAmount !== "number"
    || typeof candidate.manualCreditAmount !== "number"
    || typeof candidate.depositDeductionAmount !== "number"
    || typeof candidate.projectedTenantBalanceBeforeDeposit !== "number"
    || typeof candidate.projectedDepositRefundAmount !== "number"
  ) {
    return null;
  }

  return {
    currencyCode: candidate.currencyCode,
    outstandingAmount: candidate.outstandingAmount,
    futureScheduledAmount: candidate.futureScheduledAmount,
    depositHeldAmount: candidate.depositHeldAmount,
    manualChargeAmount: candidate.manualChargeAmount,
    manualCreditAmount: candidate.manualCreditAmount,
    depositDeductionAmount: candidate.depositDeductionAmount,
    projectedTenantBalanceBeforeDeposit: candidate.projectedTenantBalanceBeforeDeposit,
    projectedDepositRefundAmount: candidate.projectedDepositRefundAmount
  };
}

export async function buildMoveOutReconciliation(
  lease: LeaseWithTenantView,
  repository: TenantLeaseRepository,
  paymentRepository: PaymentRepository
): Promise<GetMoveOutReconciliationOutput> {
  const view = await buildLeaseMoveOutView(lease, repository, paymentRepository);
  const issues: MoveOutReconciliationIssue[] = [];

  if (!view.moveOut) {
    return {
      moveOutStatus: "not_started",
      issueCount: 0,
      issues
    };
  }

  if (view.moveOut.moveOut.status === "confirmed" && !view.moveOut.inspection) {
    issues.push({
      severity: "warning",
      code: "inspection_missing",
      message: "Move-out confirmé sans inspection enregistrée"
    });
  }

  if (view.moveOut.moveOut.status === "closed") {
    const snapshotSummary = extractSnapshotSummary(view.moveOut.moveOut.finalizedStatementSnapshot);
    if (!snapshotSummary) {
      issues.push({
        severity: "blocking",
        code: "snapshot_missing_summary",
        message: "Snapshot final fermé sans résumé exploitable"
      });
    } else {
      const tolerance = 0.009;
      const driftChecks: Array<{ key: keyof MoveOutSettlementSummary; label: string }> = [
        { key: "outstandingAmount", label: "impayés" },
        { key: "futureScheduledAmount", label: "futur planifié" },
        { key: "depositHeldAmount", label: "dépôt détenu" },
        { key: "projectedTenantBalanceBeforeDeposit", label: "solde locataire projeté" },
        { key: "projectedDepositRefundAmount", label: "remboursement dépôt projeté" }
      ];

      for (const check of driftChecks) {
        const liveValue = view.moveOut.summary[check.key] as number;
        const snapshotValue = snapshotSummary[check.key] as number;
        if (Math.abs(liveValue - snapshotValue) > tolerance) {
          issues.push({
            severity: "drift_anomaly",
            code: `summary_drift_${check.key}`,
            message: `Écart détecté sur ${check.label} entre snapshot fermé et vue opérationnelle`
          });
        }
      }
    }

    if (!view.moveOut.moveOut.closureLedgerEventId) {
      issues.push({
        severity: "blocking",
        code: "closure_event_missing",
        message: "Move-out fermé sans closureLedgerEventId"
      });
    }
  }

  return {
    moveOutStatus: view.moveOut.moveOut.status,
    issueCount: issues.length,
    issues
  };
}
import type {
  CreateMoveOutInput,
  GetLeaseMoveOutOutput,
  LeaseMoveOutView,
  MoveOutDepositContext
} from "@hhousing/api-contracts";
import type { PaymentRepository, TenantLeaseRepository } from "@hhousing/data-access";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Payment } from "@hhousing/domain";
import { logOperatorAuditEvent } from "../audit-log";

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildMoveOutDepositContext(
  lease: LeaseWithTenantView,
  payments: Payment[]
): MoveOutDepositContext {
  let paidDepositAmount = 0;
  for (const payment of payments) {
    if (payment.paymentKind === "deposit" && payment.status === "paid") {
      paidDepositAmount += payment.amount;
    }
  }

  const leaseDepositAmount = lease.depositAmount;
  const suggestedHeldAmount = paidDepositAmount > 0 ? paidDepositAmount : leaseDepositAmount;
  const equivalentMonths =
    lease.monthlyRentAmount > 0
      ? Math.round((suggestedHeldAmount / lease.monthlyRentAmount) * 10) / 10
      : null;

  return {
    currencyCode: lease.currencyCode,
    paidDepositAmount,
    leaseDepositAmount,
    suggestedHeldAmount,
    equivalentMonths
  };
}

export async function buildLeaseMoveOutView(
  lease: LeaseWithTenantView,
  repository: TenantLeaseRepository,
  paymentRepository: PaymentRepository
): Promise<GetLeaseMoveOutOutput> {
  const [aggregate, payments] = await Promise.all([
    repository.getMoveOutByLeaseId(lease.id, lease.organizationId),
    paymentRepository.listPayments({ organizationId: lease.organizationId, leaseId: lease.id })
  ]);

  return {
    moveOut: aggregate?.moveOut ?? null,
    depositContext: buildMoveOutDepositContext(lease, payments)
  };
}

export async function lazyApplyDueMoveOutsForLease(
  lease: LeaseWithTenantView,
  repository: TenantLeaseRepository
): Promise<void> {
  const today = getTodayIsoDate();
  const aggregate = await repository.getMoveOutByLeaseId(lease.id, lease.organizationId);
  if (!aggregate || aggregate.moveOut.status !== "planned") {
    return;
  }

  if (aggregate.moveOut.departureEffectiveDate <= today) {
    await repository.applyMoveOutDeparture({
      moveOutId: aggregate.moveOut.id,
      organizationId: lease.organizationId,
      leaseId: lease.id
    });
  }
}

export async function lazyApplyDueMoveOutsForOrganization(
  organizationId: string,
  repository: TenantLeaseRepository
): Promise<void> {
  await repository.applyDueMoveOutsForOrganization(organizationId, getTodayIsoDate());
}

export async function createLeaseMoveOut(
  lease: LeaseWithTenantView,
  input: CreateMoveOutInput,
  initiatedByUserId: string,
  actorMemberId: string | null,
  repository: TenantLeaseRepository,
  createId: (prefix: string) => string
): Promise<LeaseMoveOutView> {
  if (lease.status !== "active") {
    throw new Error("LEASE_NOT_ACTIVE");
  }

  const existing = await repository.getMoveOutByLeaseId(lease.id, lease.organizationId);
  if (existing?.moveOut.status === "completed" || existing?.moveOut.status === "closed") {
    throw new Error("MOVE_OUT_ALREADY_COMPLETED");
  }
  if (existing?.moveOut.status === "planned") {
    throw new Error("MOVE_OUT_ALREADY_PLANNED");
  }

  const today = getTodayIsoDate();
  const status = input.departureEffectiveDate <= today ? "completed" : "planned";
  const depositRefundAmount = Math.max(0, input.depositHeldAmount - input.depositRetentionAmount);

  const moveOut = await repository.createSimpleMoveOut({
    id: createId("mvo"),
    organizationId: lease.organizationId,
    leaseId: lease.id,
    initiatedByUserId,
    leaseEndDate: input.leaseEndDate,
    departureEffectiveDate: input.departureEffectiveDate,
    endedBy: input.endedBy,
    reasonCode: input.reasonCode ?? null,
    reasonNote: input.reasonNote ?? null,
    status,
    depositHeldAmount: input.depositHeldAmount,
    depositAmountOverridden: input.depositAmountOverridden,
    depositDisposition: input.depositDisposition,
    depositRetentionAmount: input.depositRetentionAmount,
    depositRetentionReasonCode: input.depositRetentionReasonCode ?? null,
    depositRetentionNote: input.depositRetentionNote ?? null,
    depositRefundAmount,
    currencyCode: input.currencyCode
  });

  await logOperatorAuditEvent({
    organizationId: lease.organizationId,
    actorMemberId,
    actionKey: "operations.lease.move_out_created",
    entityType: "move_out",
    entityId: moveOut.id,
    metadata: {
      leaseId: lease.id,
      status: moveOut.status,
      departureEffectiveDate: moveOut.departureEffectiveDate,
      depositRefundAmount
    }
  });

  return {
    moveOut,
    depositContext: {
      currencyCode: input.currencyCode,
      paidDepositAmount: input.depositHeldAmount,
      leaseDepositAmount: lease.depositAmount,
      suggestedHeldAmount: input.depositHeldAmount,
      equivalentMonths: null
    }
  };
}

export async function confirmLeaseMoveOutDeparture(
  lease: LeaseWithTenantView,
  actorMemberId: string | null,
  repository: TenantLeaseRepository
): Promise<LeaseMoveOutView> {
  const aggregate = await repository.getMoveOutByLeaseId(lease.id, lease.organizationId);
  if (!aggregate || aggregate.moveOut.status !== "planned") {
    throw new Error("MOVE_OUT_NOT_PLANNED");
  }

  const moveOut = await repository.applyMoveOutDeparture({
    moveOutId: aggregate.moveOut.id,
    organizationId: lease.organizationId,
    leaseId: lease.id
  });

  if (!moveOut) {
    throw new Error("MOVE_OUT_APPLY_FAILED");
  }

  await logOperatorAuditEvent({
    organizationId: lease.organizationId,
    actorMemberId,
    actionKey: "operations.lease.move_out_confirmed",
    entityType: "move_out",
    entityId: moveOut.id,
    metadata: { leaseId: lease.id }
  });

  return {
    moveOut,
    depositContext: {
      currencyCode: moveOut.currencyCode ?? lease.currencyCode,
      paidDepositAmount: moveOut.depositHeldAmount ?? 0,
      leaseDepositAmount: lease.depositAmount,
      suggestedHeldAmount: moveOut.depositHeldAmount ?? 0,
      equivalentMonths: null
    }
  };
}

export async function cancelLeaseMoveOut(
  lease: LeaseWithTenantView,
  actorMemberId: string | null,
  repository: TenantLeaseRepository
): Promise<LeaseMoveOutView> {
  const aggregate = await repository.getMoveOutByLeaseId(lease.id, lease.organizationId);
  if (!aggregate || aggregate.moveOut.status !== "planned") {
    throw new Error("MOVE_OUT_NOT_PLANNED");
  }

  const moveOut = await repository.cancelMoveOut({
    moveOutId: aggregate.moveOut.id,
    organizationId: lease.organizationId
  });

  if (!moveOut) {
    throw new Error("MOVE_OUT_CANCEL_FAILED");
  }

  await logOperatorAuditEvent({
    organizationId: lease.organizationId,
    actorMemberId,
    actionKey: "operations.lease.move_out_cancelled",
    entityType: "move_out",
    entityId: moveOut.id,
    metadata: { leaseId: lease.id }
  });

  return {
    moveOut,
    depositContext: {
      currencyCode: moveOut.currencyCode ?? lease.currencyCode,
      paidDepositAmount: moveOut.depositHeldAmount ?? 0,
      leaseDepositAmount: lease.depositAmount,
      suggestedHeldAmount: moveOut.depositHeldAmount ?? 0,
      equivalentMonths: null
    }
  };
}

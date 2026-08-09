import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import type { MoveOut, Payment } from "@hhousing/domain";
import {
  buildMoveOutDepositContext,
  cancelLeaseMoveOut,
  confirmLeaseMoveOutDeparture,
  createLeaseMoveOut,
  lazyApplyDueMoveOutsForLease
} from "./move-out";

vi.mock("../audit-log", () => ({
  logOperatorAuditEvent: vi.fn().mockResolvedValue(undefined)
}));

function baseLease(overrides: Partial<LeaseWithTenantView> = {}): LeaseWithTenantView {
  return {
    id: "lease-1",
    organizationId: "org-1",
    unitId: "unit-1",
    tenantId: "tenant-1",
    startDate: "2026-01-01",
    endDate: null,
    monthlyRentAmount: 500,
    currencyCode: "USD",
    termType: "month_to_month",
    fixedTermMonths: null,
    autoRenewToMonthly: false,
    paymentFrequency: "monthly",
    paymentStartDate: "2026-01-01",
    dueDayOfMonth: 1,
    depositAmount: 1000,
    moveInMode: "standard",
    depositSettledExternally: false,
    depositSettledNote: null,
    status: "active",
    signedAt: "2026-01-01",
    signingMethod: "physical",
    activatedAtIso: "2026-01-01T00:00:00.000Z",
    createdAtIso: "2026-01-01T00:00:00.000Z",
    tenantFullName: "Ada Tenant",
    tenantEmail: "ada@example.com",
    ...overrides
  };
}

function baseMoveOut(overrides: Partial<MoveOut> = {}): MoveOut {
  return {
    id: "mvo-1",
    organizationId: "org-1",
    leaseId: "lease-1",
    initiatedByUserId: "user-1",
    moveOutDate: "2026-09-01",
    leaseEndDate: "2026-09-01",
    departureEffectiveDate: "2026-09-01",
    endedBy: "tenant",
    reasonCode: "end_of_lease",
    reasonNote: null,
    reason: null,
    status: "planned",
    depositHeldAmount: 1000,
    depositAmountOverridden: false,
    depositDisposition: "full_refund",
    depositRetentionAmount: 0,
    depositRetentionReasonCode: null,
    depositRetentionNote: null,
    depositRefundAmount: 1000,
    currencyCode: "USD",
    closureLedgerEventId: null,
    finalizedStatementSnapshot: null,
    finalizedStatementHash: null,
    confirmedAtIso: null,
    closedAtIso: null,
    completedAtIso: null,
    cancelledAtIso: null,
    createdAtIso: "2026-08-01T00:00:00.000Z",
    updatedAtIso: "2026-08-01T00:00:00.000Z",
    ...overrides
  };
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    organizationId: "org-1",
    leaseId: "lease-1",
    tenantId: "tenant-1",
    amount: 1000,
    currencyCode: "USD",
    dueDate: "2026-01-01",
    paidDate: "2026-01-02",
    status: "paid",
    note: null,
    paymentKind: "deposit",
    billingFrequency: "one_time",
    sourceLeaseChargeTemplateId: null,
    isInitialCharge: true,
    chargePeriod: null,
    createdAtIso: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("buildMoveOutDepositContext", () => {
  it("prefers paid deposit payments over lease deposit amount", () => {
    const context = buildMoveOutDepositContext(baseLease(), [
      payment({ amount: 800, paymentKind: "deposit", status: "paid" }),
      payment({ id: "pay-2", amount: 200, paymentKind: "deposit", status: "paid" }),
      payment({ id: "pay-3", amount: 500, paymentKind: "rent", status: "paid" }),
      payment({ id: "pay-4", amount: 100, paymentKind: "deposit", status: "pending" })
    ]);

    expect(context.paidDepositAmount).toBe(1000);
    expect(context.leaseDepositAmount).toBe(1000);
    expect(context.suggestedHeldAmount).toBe(1000);
    expect(context.equivalentMonths).toBe(2);
  });

  it("falls back to lease deposit when no paid deposit exists", () => {
    const context = buildMoveOutDepositContext(
      baseLease({ depositAmount: 1500, monthlyRentAmount: 500 }),
      [payment({ amount: 500, paymentKind: "rent", status: "paid" })]
    );

    expect(context.paidDepositAmount).toBe(0);
    expect(context.suggestedHeldAmount).toBe(1500);
    expect(context.equivalentMonths).toBe(3);
  });
});

describe("createLeaseMoveOut", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("creates a planned move-out and computes refund amount", async () => {
    const created = baseMoveOut({
      depositHeldAmount: 1000,
      depositRetentionAmount: 250,
      depositRefundAmount: 750,
      depositDisposition: "partial_retention"
    });
    const repository = {
      getMoveOutByLeaseId: vi.fn().mockResolvedValue(null),
      createSimpleMoveOut: vi.fn().mockResolvedValue(created)
    } as unknown as TenantLeaseRepository;

    const result = await createLeaseMoveOut(
      baseLease(),
      {
        departureEffectiveDate: "2099-01-15",
        leaseEndDate: "2099-01-31",
        endedBy: "tenant",
        reasonCode: "early_departure",
        reasonNote: null,
        depositHeldAmount: 1000,
        depositAmountOverridden: false,
        depositDisposition: "partial_retention",
        depositRetentionAmount: 250,
        depositRetentionReasonCode: "damage",
        depositRetentionNote: null,
        currencyCode: "USD"
      },
      "user-1",
      "member-1",
      repository,
      (prefix) => `${prefix}-test`
    );

    expect(repository.createSimpleMoveOut).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "mvo-test",
        status: "planned",
        depositRefundAmount: 750,
        departureEffectiveDate: "2099-01-15",
        leaseEndDate: "2099-01-31"
      })
    );
    expect(result.moveOut.depositRefundAmount).toBe(750);
  });

  it("completes immediately when departure date is today or earlier", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));

    const repository = {
      getMoveOutByLeaseId: vi.fn().mockResolvedValue(null),
      createSimpleMoveOut: vi.fn().mockResolvedValue(baseMoveOut({ status: "completed" }))
    } as unknown as TenantLeaseRepository;

    await createLeaseMoveOut(
      baseLease(),
      {
        departureEffectiveDate: "2026-08-09",
        leaseEndDate: "2026-08-09",
        endedBy: "landlord",
        reasonCode: null,
        reasonNote: null,
        depositHeldAmount: 1000,
        depositAmountOverridden: false,
        depositDisposition: "full_refund",
        depositRetentionAmount: 0,
        depositRetentionReasonCode: null,
        depositRetentionNote: null,
        currencyCode: "USD"
      },
      "user-1",
      null,
      repository,
      (prefix) => `${prefix}-now`
    );

    expect(repository.createSimpleMoveOut).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
  });

  it("rejects when a planned move-out already exists", async () => {
    const repository = {
      getMoveOutByLeaseId: vi.fn().mockResolvedValue({
        moveOut: baseMoveOut({ status: "planned" }),
        charges: [],
        inspection: null
      }),
      createSimpleMoveOut: vi.fn()
    } as unknown as TenantLeaseRepository;

    await expect(
      createLeaseMoveOut(
        baseLease(),
        {
          departureEffectiveDate: "2099-01-15",
          leaseEndDate: "2099-01-15",
          endedBy: "tenant",
          depositHeldAmount: 1000,
          depositAmountOverridden: false,
          depositDisposition: "full_refund",
          depositRetentionAmount: 0,
          currencyCode: "USD"
        },
        "user-1",
        null,
        repository,
        (prefix) => `${prefix}-x`
      )
    ).rejects.toThrow("MOVE_OUT_ALREADY_PLANNED");
  });
});

describe("confirm and cancel move-out", () => {
  it("confirms a planned departure", async () => {
    const repository = {
      getMoveOutByLeaseId: vi.fn().mockResolvedValue({
        moveOut: baseMoveOut({ status: "planned" }),
        charges: [],
        inspection: null
      }),
      applyMoveOutDeparture: vi.fn().mockResolvedValue(baseMoveOut({ status: "completed" }))
    } as unknown as TenantLeaseRepository;

    const result = await confirmLeaseMoveOutDeparture(baseLease(), "member-1", repository);
    expect(repository.applyMoveOutDeparture).toHaveBeenCalledWith({
      moveOutId: "mvo-1",
      organizationId: "org-1",
      leaseId: "lease-1"
    });
    expect(result.moveOut.status).toBe("completed");
  });

  it("cancels a planned move-out", async () => {
    const repository = {
      getMoveOutByLeaseId: vi.fn().mockResolvedValue({
        moveOut: baseMoveOut({ status: "planned" }),
        charges: [],
        inspection: null
      }),
      cancelMoveOut: vi.fn().mockResolvedValue(baseMoveOut({ status: "cancelled" }))
    } as unknown as TenantLeaseRepository;

    const result = await cancelLeaseMoveOut(baseLease(), null, repository);
    expect(repository.cancelMoveOut).toHaveBeenCalledWith({
      moveOutId: "mvo-1",
      organizationId: "org-1"
    });
    expect(result.moveOut.status).toBe("cancelled");
  });
});

describe("lazyApplyDueMoveOutsForLease", () => {
  it("applies when planned departure date is due", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T10:00:00.000Z"));

    const repository = {
      getMoveOutByLeaseId: vi.fn().mockResolvedValue({
        moveOut: baseMoveOut({
          status: "planned",
          departureEffectiveDate: "2026-09-01"
        }),
        charges: [],
        inspection: null
      }),
      applyMoveOutDeparture: vi.fn().mockResolvedValue(baseMoveOut({ status: "completed" }))
    } as unknown as TenantLeaseRepository;

    await lazyApplyDueMoveOutsForLease(baseLease(), repository);

    expect(repository.applyMoveOutDeparture).toHaveBeenCalledTimes(1);
  });

  it("skips when departure is still in the future", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T10:00:00.000Z"));

    const repository = {
      getMoveOutByLeaseId: vi.fn().mockResolvedValue({
        moveOut: baseMoveOut({
          status: "planned",
          departureEffectiveDate: "2026-09-01"
        }),
        charges: [],
        inspection: null
      }),
      applyMoveOutDeparture: vi.fn()
    } as unknown as TenantLeaseRepository;

    await lazyApplyDueMoveOutsForLease(baseLease(), repository);

    expect(repository.applyMoveOutDeparture).not.toHaveBeenCalled();
  });
});

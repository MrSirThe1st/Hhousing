import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  getLeaseByIdMock,
  closeLeaseMoveOutMock,
  buildLeaseMoveOutViewMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getLeaseByIdMock: vi.fn(),
  closeLeaseMoveOutMock: vi.fn(),
  buildLeaseMoveOutViewMock: vi.fn()
}));

vi.mock("../../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

vi.mock("../../../../../../api/leases/move-out", () => ({
  closeLeaseMoveOut: closeLeaseMoveOutMock,
  buildLeaseMoveOutView: buildLeaseMoveOutViewMock
}));

vi.mock("../../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../../shared")>("../../../../shared");

  return {
    ...actual,
    createTenantLeaseRepo: () => ({
      getLeaseById: getLeaseByIdMock
    }),
    createPaymentRepo: () => ({
      listPayments: vi.fn()
    }),
    createTeamFunctionsRepo: () => ({
      listMemberFunctions: vi.fn()
    })
  };
});

import { PATCH } from "./route";

describe("/api/leases/[id]/move-out/close", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    getScopedPortfolioDataMock.mockResolvedValue({
      leaseIds: new Set(["lease-1"])
    });

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      organizationId: "org-1",
      status: "active",
      tenantId: "tenant-1",
      unitId: "unit-1",
      startDate: "2026-01-01",
      endDate: null,
      monthlyRentAmount: 500,
      currencyCode: "CDF",
      termType: "month_to_month",
      fixedTermMonths: null,
      autoRenewToMonthly: false,
      paymentFrequency: "monthly",
      paymentStartDate: "2026-01-01",
      dueDayOfMonth: 1,
      depositAmount: 100,
      createdAtIso: "2026-01-01T00:00:00.000Z",
      tenantFullName: "Tenant One",
      tenantEmail: "tenant@example.com",
      tenantPhone: null,
      unitNumber: "A1",
      propertyId: "property-1",
      propertyName: "Immeuble A",
      signedAt: null,
      signingMethod: null
    });
  });

  it("rejects non-operator access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "tenant-user",
      role: "tenant",
      organizationId: "org-1",
      memberships: []
    });

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1/move-out/close", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ closureLedgerEventId: 100 })
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
  });

  it("returns validation error for malformed payload", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1/move-out/close", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ closureLedgerEventId: 0 })
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "closureLedgerEventId must be a positive integer"
    });
    expect(closeLeaseMoveOutMock).not.toHaveBeenCalled();
  });

  it("closes move-out and returns closed view", async () => {
    closeLeaseMoveOutMock.mockResolvedValue(undefined);
    buildLeaseMoveOutViewMock.mockResolvedValue({
      moveOut: {
        moveOut: {
          id: "mvo-1",
          organizationId: "org-1",
          leaseId: "lease-1",
          initiatedByUserId: "user-1",
          moveOutDate: "2026-05-01",
          reason: null,
          status: "closed",
          closureLedgerEventId: 100,
          finalizedStatementSnapshot: { ok: true },
          finalizedStatementHash: "hash",
          confirmedAtIso: "2026-05-02T00:00:00.000Z",
          closedAtIso: "2026-05-03T00:00:00.000Z",
          createdAtIso: "2026-04-16T00:00:00.000Z",
          updatedAtIso: "2026-04-16T00:00:00.000Z"
        },
        charges: [],
        inspection: null,
        summary: {
          currencyCode: "CDF",
          outstandingAmount: 0,
          futureScheduledAmount: 0,
          depositHeldAmount: 0,
          manualChargeAmount: 0,
          manualCreditAmount: 0,
          depositDeductionAmount: 0,
          projectedTenantBalanceBeforeDeposit: 0,
          projectedDepositRefundAmount: 0
        }
      },
      summary: {
        currencyCode: "CDF",
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

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1/move-out/close", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ closureLedgerEventId: 100 })
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.data.moveOut.status).toBe("closed");
    expect(payload.data.moveOut.closureLedgerEventId).toBe(100);
    expect(closeLeaseMoveOutMock).toHaveBeenCalledTimes(1);
  });
});

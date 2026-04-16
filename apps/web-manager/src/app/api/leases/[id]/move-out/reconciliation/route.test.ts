import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  getLeaseByIdMock,
  buildMoveOutReconciliationMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getLeaseByIdMock: vi.fn(),
  buildMoveOutReconciliationMock: vi.fn()
}));

vi.mock("../../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

vi.mock("../../../../../../api/leases/move-out", () => ({
  buildMoveOutReconciliation: buildMoveOutReconciliationMock
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

import { GET } from "./route";

describe("/api/leases/[id]/move-out/reconciliation", () => {
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

    const response = await GET(new Request("http://localhost/api/leases/lease-1/move-out/reconciliation"), {
      params: Promise.resolve({ id: "lease-1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
  });

  it("returns 404 when lease does not exist", async () => {
    getLeaseByIdMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/leases/lease-404/move-out/reconciliation"), {
      params: Promise.resolve({ id: "lease-404" })
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      success: false,
      code: "NOT_FOUND",
      error: "Lease not found"
    });
  });

  it("returns reconciliation payload on success", async () => {
    buildMoveOutReconciliationMock.mockResolvedValue({
      moveOutStatus: "closed",
      issueCount: 1,
      issues: [
        {
          severity: "drift_anomaly",
          code: "summary_drift_outstandingAmount",
          message: "drift"
        }
      ]
    });

    const response = await GET(new Request("http://localhost/api/leases/lease-1/move-out/reconciliation"), {
      params: Promise.resolve({ id: "lease-1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        moveOutStatus: "closed",
        issueCount: 1,
        issues: [
          {
            severity: "drift_anomaly",
            code: "summary_drift_outstandingAmount",
            message: "drift"
          }
        ]
      }
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  getLeaseByIdMock,
  getMoveOutByLeaseIdMock,
  upsertLeaseMoveOutInspectionMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getLeaseByIdMock: vi.fn(),
  getMoveOutByLeaseIdMock: vi.fn(),
  upsertLeaseMoveOutInspectionMock: vi.fn()
}));

vi.mock("../../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

vi.mock("../../../../../../api/leases/move-out", () => ({
  upsertLeaseMoveOutInspection: upsertLeaseMoveOutInspectionMock
}));

vi.mock("../../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../../shared")>("../../../../shared");

  return {
    ...actual,
    createTenantLeaseRepo: () => ({
      getLeaseById: getLeaseByIdMock,
      getMoveOutByLeaseId: getMoveOutByLeaseIdMock
    }),
    createTeamFunctionsRepo: () => ({
      listMemberFunctions: vi.fn()
    })
  };
});

import { PATCH } from "./route";

describe("/api/leases/[id]/move-out/inspection", () => {
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
      new Request("http://localhost/api/leases/lease-1/move-out/inspection", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checklistSnapshot: [] })
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
      new Request("http://localhost/api/leases/lease-1/move-out/inspection", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checklistSnapshot: "invalid" })
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "checklistSnapshot must be an array"
    });
    expect(upsertLeaseMoveOutInspectionMock).not.toHaveBeenCalled();
  });

  it("saves and returns inspection", async () => {
    upsertLeaseMoveOutInspectionMock.mockResolvedValue(undefined);
    getMoveOutByLeaseIdMock.mockResolvedValue({
      moveOut: {
        id: "mvo-1",
        organizationId: "org-1",
        leaseId: "lease-1",
        initiatedByUserId: "user-1",
        moveOutDate: "2026-05-01",
        reason: null,
        status: "draft",
        closureLedgerEventId: null,
        finalizedStatementSnapshot: null,
        finalizedStatementHash: null,
        confirmedAtIso: null,
        closedAtIso: null,
        createdAtIso: "2026-04-16T00:00:00.000Z",
        updatedAtIso: "2026-04-16T00:00:00.000Z"
      },
      charges: [],
      inspection: {
        id: "min-1",
        moveOutId: "mvo-1",
        organizationId: "org-1",
        checklistSnapshot: [
          { id: "keys_returned", label: "Clés récupérées", isChecked: true, note: null }
        ],
        notes: "RAS",
        photoDocumentIds: ["doc-1"],
        inspectedAtIso: "2026-05-02T00:00:00.000Z",
        createdAtIso: "2026-04-16T00:00:00.000Z",
        updatedAtIso: "2026-04-16T00:00:00.000Z"
      }
    });

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1/move-out/inspection", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checklistSnapshot: [
            { id: "keys_returned", label: "Clés récupérées", isChecked: true, note: null }
          ],
          notes: "RAS",
          photoDocumentIds: ["doc-1"],
          inspectedAt: "2026-05-02"
        })
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual({
      id: "min-1",
      moveOutId: "mvo-1",
      organizationId: "org-1",
      checklistSnapshot: [
        { id: "keys_returned", label: "Clés récupérées", isChecked: true, note: null }
      ],
      notes: "RAS",
      photoDocumentIds: ["doc-1"],
      inspectedAtIso: "2026-05-02T00:00:00.000Z",
      createdAtIso: "2026-04-16T00:00:00.000Z",
      updatedAtIso: "2026-04-16T00:00:00.000Z"
    });
    expect(upsertLeaseMoveOutInspectionMock).toHaveBeenCalledTimes(1);
  });
});
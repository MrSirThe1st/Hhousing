import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  generateMonthlyChargesMock,
  listMemberFunctionsMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  generateMonthlyChargesMock: vi.fn(),
  listMemberFunctionsMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createPaymentRepo: () => ({
      generateMonthlyCharges: generateMonthlyChargesMock
    }),
    createTeamFunctionsRepo: () => ({
      listMemberFunctions: listMemberFunctionsMock
    })
  };
});

import { POST } from "./route";

describe("/api/payments/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getScopedPortfolioDataMock.mockResolvedValue({
      currentScope: "managed",
      properties: [],
      propertyIds: new Set(),
      unitIds: new Set(),
      leases: [],
      leaseIds: new Set(),
      tenantIds: new Set()
    });
    listMemberFunctionsMock.mockResolvedValue([
      {
        id: "fn-accountant",
        organizationId: "org-1",
        functionCode: "ACCOUNTANT",
        displayName: "Accountant",
        description: null,
        permissions: ["record_payment"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);
  });

  it("rejects tenant-role access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      memberships: []
    });

    const response = await POST(new Request("http://localhost/api/payments/generate", {
      method: "POST",
      body: JSON.stringify({ period: "2026-04" }),
      headers: { "content-type": "application/json" }
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
    expect(generateMonthlyChargesMock).not.toHaveBeenCalled();
  });

  it("rejects invalid period payload", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      memberships: [
        {
          id: "membership-1",
          userId: "user-1",
          organizationId: "org-1",
          organizationName: "Org A",
          role: "property_manager",
          status: "active",
          capabilities: { canOwnProperties: false },
          createdAtIso: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    const response = await POST(new Request("http://localhost/api/payments/generate", {
      method: "POST",
      body: JSON.stringify({ period: "04-2026" }),
      headers: { "content-type": "application/json" }
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "period must be YYYY-MM"
    });
    expect(generateMonthlyChargesMock).not.toHaveBeenCalled();
  });

  it("generates recurring charges for the scoped period", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      memberships: [
        {
          id: "membership-1",
          userId: "user-1",
          organizationId: "org-1",
          organizationName: "Org A",
          role: "property_manager",
          status: "active",
          capabilities: { canOwnProperties: false },
          createdAtIso: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
    generateMonthlyChargesMock.mockResolvedValue(3);

    const response = await POST(new Request("http://localhost/api/payments/generate", {
      method: "POST",
      body: JSON.stringify({ period: "2026-04" }),
      headers: { "content-type": "application/json" }
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        period: "2026-04",
        generated: 3
      }
    });
    expect(generateMonthlyChargesMock).toHaveBeenCalledWith("org-1", "2026-04", "managed");
  });
});
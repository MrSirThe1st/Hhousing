import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  getExpenseByIdMock,
  updateExpenseMock,
  deleteExpenseMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getExpenseByIdMock: vi.fn(),
  updateExpenseMock: vi.fn(),
  deleteExpenseMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../api")>("../../../../api");
  return {
    ...actual,
    updateExpense: updateExpenseMock,
    deleteExpense: deleteExpenseMock
  };
});

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");
  return {
    ...actual,
    createExpenseRepo: () => ({
      getExpenseById: getExpenseByIdMock
    }),
    createTeamFunctionsRepo: () => ({
      listMemberFunctions: vi.fn().mockResolvedValue([])
    })
  };
});

vi.mock("../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

import { DELETE, PATCH } from "./route";

describe("/api/expenses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getScopedPortfolioDataMock.mockResolvedValue({
      currentScope: "owned",
      properties: [],
      propertyIds: new Set(["property-1"]),
      unitIds: new Set(),
      leases: [],
      leaseIds: new Set(),
      tenantIds: new Set()
    });
    getExpenseByIdMock.mockResolvedValue({
      id: "exp-1",
      organizationId: "org-1",
      propertyId: "property-1",
      unitId: null,
      title: "Réparation plomberie",
      category: "maintenance",
      vendorName: "Plombier Kasa",
      payeeName: "Plombier Kasa",
      amount: 125,
      currencyCode: "USD",
      expenseDate: "2026-04-09",
      note: null,
      createdAtIso: "2026-04-09T10:00:00.000Z"
    });
  });

  it("updates an expense", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      memberships: []
    });

    updateExpenseMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          id: "exp-1"
        }
      }
    });

    const response = await PATCH(
      new Request("http://localhost/api/expenses/exp-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId: "org-1",
          propertyId: "property-1",
          title: "Réparation plomberie",
          category: "maintenance",
          vendorName: "Plombier Kasa",
          payeeName: "Plombier Kasa",
          amount: 125,
          currencyCode: "USD",
          expenseDate: "2026-04-09",
          note: null
        })
      }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(200);
    expect(updateExpenseMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid patch json", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      memberships: []
    });

    const response = await PATCH(
      new Request("http://localhost/api/expenses/exp-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "{"
      }),
      { params: Promise.resolve({ id: "exp-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  });

  it("returns auth failures from delete", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      memberships: []
    });

    deleteExpenseMock.mockResolvedValue({
      status: 403,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "Tenants are not permitted to access the operator system"
      }
    });

    const response = await DELETE(new Request("http://localhost/api/expenses/exp-1", {
      method: "DELETE"
    }), { params: Promise.resolve({ id: "exp-1" }) });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
  });
});
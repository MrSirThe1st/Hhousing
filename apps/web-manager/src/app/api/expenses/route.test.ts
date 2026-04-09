import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createExpenseMock,
  listExpensesMock,
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock
} = vi.hoisted(() => ({
  createExpenseMock: vi.fn(),
  listExpensesMock: vi.fn(),
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn()
}));

vi.mock("../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../api")>("../../../api");
  return {
    ...actual,
    createExpense: createExpenseMock,
    listExpenses: listExpensesMock
  };
});

vi.mock("../shared", async () => {
  const actual = await vi.importActual<typeof import("../shared")>("../shared");
  return {
    ...actual,
    createExpenseRepo: () => ({}),
    createTeamFunctionsRepo: () => ({})
  };
});

vi.mock("../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock,
  filterExpensesByScope: (expenses: unknown[]) => expenses
}));

import { GET, POST } from "./route";

describe("/api/expenses", () => {
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
      currentScope: "owned",
      properties: [],
      propertyIds: new Set(["property-1"]),
      unitIds: new Set(),
      leases: [],
      leaseIds: new Set(),
      tenantIds: new Set()
    });
  });

  it("creates an expense", async () => {
    createExpenseMock.mockResolvedValue({
      status: 201,
      body: {
        success: true,
        data: {
          id: "exp-1",
          organizationId: "org-1",
          propertyId: "property-1",
          title: "Réparation plomberie",
          category: "maintenance",
          amount: 125,
          currencyCode: "USD",
          expenseDate: "2026-04-09",
          note: null,
          createdAtIso: "2026-04-09T10:00:00.000Z"
        }
      }
    });

    const response = await POST(new Request("http://localhost/api/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: "org-1",
        propertyId: "property-1",
        title: "Réparation plomberie",
        category: "maintenance",
        amount: 125,
        currencyCode: "USD",
        expenseDate: "2026-04-09",
        note: null
      })
    }));

    expect(response.status).toBe(201);
    expect(createExpenseMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid json payloads", async () => {
    const response = await POST(new Request("http://localhost/api/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{" 
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
    expect(createExpenseMock).not.toHaveBeenCalled();
  });

  it("returns auth failures from list", async () => {
    listExpensesMock.mockResolvedValue({
      status: 403,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "Tenants are not permitted to access the operator system"
      }
    });

    const response = await GET(new Request("http://localhost/api/expenses"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
  });
});
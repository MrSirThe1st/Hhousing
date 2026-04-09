import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  listMemberFunctionsMock,
  loadScopedFinanceDataMock,
  buildRevenueDatasetMock,
  buildExpenseDatasetMock,
  buildFinanceReportCsvMock,
  normalizeFinanceFiltersMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  listMemberFunctionsMock: vi.fn(),
  loadScopedFinanceDataMock: vi.fn(),
  buildRevenueDatasetMock: vi.fn(),
  buildExpenseDatasetMock: vi.fn(),
  buildFinanceReportCsvMock: vi.fn(),
  normalizeFinanceFiltersMock: vi.fn()
}));

vi.mock("../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../../lib/finance-reporting", () => ({
  loadScopedFinanceData: loadScopedFinanceDataMock,
  buildRevenueDataset: buildRevenueDatasetMock,
  buildExpenseDataset: buildExpenseDatasetMock,
  buildFinanceReportCsv: buildFinanceReportCsvMock,
  normalizeFinanceFilters: normalizeFinanceFiltersMock
}));

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createTeamFunctionsRepo: () => ({
      listMemberFunctions: listMemberFunctionsMock
    })
  };
});

import { GET } from "./route";

describe("/api/reports/finance/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeFinanceFiltersMock.mockReturnValue({
      propertyId: null,
      from: "2026-01-01",
      to: "2026-04-30"
    });
  });

  it("exports finance csv", async () => {
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
    listMemberFunctionsMock.mockResolvedValue([
      {
        id: "fn-1",
        organizationId: "org-1",
        functionCode: "ACCOUNTANT",
        displayName: "Accounting",
        description: null,
        permissions: ["view_payments"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);
    loadScopedFinanceDataMock.mockResolvedValue({
      payments: [],
      expenses: [],
      scopedPortfolio: { properties: [] }
    });
    buildRevenueDatasetMock.mockReturnValue({ ledger: [], monthlyRevenue: [], propertyRevenue: [], revenueTotals: [] });
    buildExpenseDatasetMock.mockReturnValue({ ledger: [], monthlyExpenses: [], propertyExpenses: [], expenseTotals: [] });
    buildFinanceReportCsvMock.mockReturnValue("section,label\nsummary,total");

    const response = await GET(new Request("http://localhost/api/reports/finance/export?from=2026-01-01&to=2026-04-30"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(await response.text()).toBe("section,label\nsummary,total");
  });

  it("rejects tenant access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      memberships: []
    });

    const response = await GET(new Request("http://localhost/api/reports/finance/export"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
  });
});
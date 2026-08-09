import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  listMemberFunctionsMock,
  loadFinanceExportDatasetsMock,
  buildFinanceReportCsvMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  listMemberFunctionsMock: vi.fn(),
  loadFinanceExportDatasetsMock: vi.fn(),
  buildFinanceReportCsvMock: vi.fn()
}));

vi.mock("../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../../lib/finance-reporting", () => ({
  buildFinanceReportCsv: buildFinanceReportCsvMock
}));

vi.mock("../../../../../lib/finance-export-data", () => ({
  loadFinanceExportDatasets: loadFinanceExportDatasetsMock
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
  });

  it("returns FEATURE_DISABLED while reports are deferred for V1", async () => {
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
    loadFinanceExportDatasetsMock.mockResolvedValue({
      filters: { propertyId: null, from: "2026-01-01", to: "2026-04-30" },
      revenueDataset: { ledger: [], monthlyRevenue: [], propertyRevenue: [], revenueTotals: [] },
      expenseDataset: { ledger: [], monthlyExpenses: [], propertyExpenses: [], expenseTotals: [] }
    });
    buildFinanceReportCsvMock.mockReturnValue("section,label\nsummary,total");

    const response = await GET(new Request("http://localhost/api/reports/finance/export?from=2026-01-01&to=2026-04-30"));

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      success: false,
      code: "FEATURE_DISABLED"
    });
    expect(loadFinanceExportDatasetsMock).not.toHaveBeenCalled();
  });

  it("rejects tenant access before feature gate", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      memberships: []
    });

    const response = await GET(new Request("http://localhost/api/reports/finance/export"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).not.toBe("FEATURE_DISABLED");
  });
});

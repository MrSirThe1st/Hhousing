import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  generateMonthlyChargesMock,
  listOrganizationsWithActiveRecurringChargesMock
} = vi.hoisted(() => ({
  generateMonthlyChargesMock: vi.fn(),
  listOrganizationsWithActiveRecurringChargesMock: vi.fn()
}));

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");

  return {
    ...actual,
    createPaymentRepo: () => ({
      generateMonthlyCharges: generateMonthlyChargesMock,
      listOrganizationsWithActiveRecurringCharges: listOrganizationsWithActiveRecurringChargesMock
    })
  };
});

import { GET } from "./route";

describe("/api/internal/payments/generate-recurring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T10:00:00.000Z"));
    process.env.CRON_SECRET = "test-cron-secret";
    listOrganizationsWithActiveRecurringChargesMock.mockResolvedValue(["org-1", "org-2"]);
    generateMonthlyChargesMock.mockImplementation(async (organizationId: string) => {
      if (organizationId === "org-1") {
        return 2;
      }

      return 1;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects requests without the cron secret", async () => {
    const response = await GET(new Request("http://localhost/api/internal/payments/generate-recurring"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      error: "Unauthorized"
    });
  });

  it("runs generation for all organizations on scheduled GET", async () => {
    const response = await GET(new Request("http://localhost/api/internal/payments/generate-recurring", {
      headers: { authorization: "Bearer test-cron-secret" }
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        period: "2026-04",
        processedOrganizations: 2,
        totalGenerated: 3,
        organizations: [
          { organizationId: "org-1", generated: 2 },
          { organizationId: "org-2", generated: 1 }
        ],
        failures: []
      }
    });
    expect(listOrganizationsWithActiveRecurringChargesMock).toHaveBeenCalledTimes(1);
    expect(generateMonthlyChargesMock).toHaveBeenNthCalledWith(1, "org-1", "2026-04");
    expect(generateMonthlyChargesMock).toHaveBeenNthCalledWith(2, "org-2", "2026-04");
  });
});
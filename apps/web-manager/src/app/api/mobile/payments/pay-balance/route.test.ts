import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractTenantSessionFromRequestMock,
  initiateTenantBalanceDepositMock
} = vi.hoisted(() => ({
  extractTenantSessionFromRequestMock: vi.fn(),
  initiateTenantBalanceDepositMock: vi.fn()
}));

vi.mock("../../../../../auth/session-adapter", () => ({
  extractTenantSessionFromRequest: extractTenantSessionFromRequestMock
}));

vi.mock("../../../../../api/payments/initiate-tenant-balance-deposit", () => ({
  initiateTenantBalanceDeposit: initiateTenantBalanceDepositMock
}));

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createTenantLeaseRepo: () => ({}),
    createPaymentRepo: () => ({}),
    createPawapayTransactionRepo: () => ({})
  };
});

import { POST } from "./route";

const tenantSession = {
  success: true as const,
  data: {
    userId: "tenant-auth-1",
    role: "tenant",
    organizationId: "org-1",
    capabilities: { canOwnProperties: false },
    memberships: []
  }
};

describe("POST /api/mobile/payments/pay-balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });

    const response = await POST(
      new Request("http://localhost/api/mobile/payments/pay-balance", {
        method: "POST",
        body: JSON.stringify({ provider: "AIRTEL_COD", phoneNumber: "0812345678" })
      })
    );

    expect(response.status).toBe(401);
  });

  it("initiates a balance deposit for authenticated tenants", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue(tenantSession);
    initiateTenantBalanceDepositMock.mockResolvedValue({
      success: true,
      data: {
        transactionId: "txn-1",
        totalAmount: 500,
        currencyCode: "CDF",
        provider: "AIRTEL_COD",
        status: "submitted",
        paymentCount: 2,
        pawapayStatus: "ACCEPTED"
      }
    });

    const response = await POST(
      new Request("http://localhost/api/mobile/payments/pay-balance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "AIRTEL_COD", phoneNumber: "0812345678" })
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.transactionId).toBe("txn-1");
  });
});

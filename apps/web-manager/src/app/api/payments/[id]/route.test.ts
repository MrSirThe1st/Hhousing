import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  getPaymentByIdMock,
  markPaymentPaidMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getPaymentByIdMock: vi.fn(),
  markPaymentPaidMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../api")>("../../../../api");

  return {
    ...actual,
    markPaymentPaid: markPaymentPaidMock
  };
});

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createTeamFunctionsRepo: () => ({
      listMemberFunctions: vi.fn().mockResolvedValue([])
    }),
    createRepositoryFromEnv: () => ({
      success: false,
      code: "INTERNAL_ERROR",
      error: "not configured"
    }),
    createPaymentRepo: (): {
      getPaymentById: typeof getPaymentByIdMock;
    } => ({
      getPaymentById: getPaymentByIdMock
    }),
    createTenantLeaseRepo: () => ({
      getTenantById: vi.fn().mockResolvedValue(null)
    }),
    createInvoiceRepo: () => ({
      syncInvoiceForPaidPayment: vi.fn().mockResolvedValue(undefined),
      markInvoiceEmailSent: vi.fn().mockResolvedValue(undefined),
      markInvoiceEmailFailed: vi.fn().mockResolvedValue(undefined)
    })
  };
});

vi.mock("../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

import { GET, PATCH } from "./route";

describe("/api/payments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getScopedPortfolioDataMock.mockResolvedValue({
      currentScope: "owned",
      properties: [],
      propertyIds: new Set(),
      unitIds: new Set(),
      leases: [],
      leaseIds: new Set(["lease-1"]),
      tenantIds: new Set()
    });
  });

  it("rejects tenant-role access on get", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    const response = await GET(new Request("http://localhost/api/payments/payment-1"), {
      params: Promise.resolve({ id: "payment-1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
    expect(getPaymentByIdMock).not.toHaveBeenCalled();
  });

  it("returns payment detail for operators", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    getPaymentByIdMock.mockResolvedValue({
      id: "payment-1",
      leaseId: "lease-1",
      status: "pending"
    });

    const response = await GET(new Request("http://localhost/api/payments/payment-1"), {
      params: Promise.resolve({ id: "payment-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        id: "payment-1",
        leaseId: "lease-1",
        status: "pending"
      }
    });
    expect(getPaymentByIdMock).toHaveBeenCalledWith("payment-1", "org-1");
  });

  it("rejects invalid patch payload", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "manager",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    getPaymentByIdMock.mockResolvedValue({
      id: "payment-1",
      leaseId: "lease-1",
      status: "pending"
    });

    markPaymentPaidMock.mockResolvedValue({
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "paidDate must be YYYY-MM-DD"
      }
    });

    const response = await PATCH(
      new Request("http://localhost/api/payments/payment-1", {
        method: "PATCH",
        body: JSON.stringify({ paidDate: "2026/01/01" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "payment-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "paidDate must be YYYY-MM-DD"
    });
    expect(markPaymentPaidMock).toHaveBeenCalledTimes(1);
  });
});
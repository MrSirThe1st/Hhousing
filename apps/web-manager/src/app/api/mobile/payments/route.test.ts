import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractTenantSessionFromRequestMock,
  listPaymentsByTenantAuthUserIdMock
} = vi.hoisted(() => ({
  extractTenantSessionFromRequestMock: vi.fn(),
  listPaymentsByTenantAuthUserIdMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractTenantSessionFromRequest: extractTenantSessionFromRequestMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");
  return {
    ...actual,
    createPaymentRepo: (): {
      listPaymentsByTenantAuthUserId: typeof listPaymentsByTenantAuthUserIdMock;
    } => ({
      listPaymentsByTenantAuthUserId: listPaymentsByTenantAuthUserIdMock
    })
  };
});

import { GET } from "./route";

describe("/api/mobile/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });

    const response = await GET(new Request("http://localhost/api/mobile/payments"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
    expect(listPaymentsByTenantAuthUserIdMock).not.toHaveBeenCalled();
  });

  it("rejects non-tenant roles", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false,
      code: "FORBIDDEN",
      error: "This endpoint is only available to tenants"
    });

    const response = await GET(new Request("http://localhost/api/mobile/payments"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "This endpoint is only available to tenants"
    });
    expect(listPaymentsByTenantAuthUserIdMock).not.toHaveBeenCalled();
  });

  it("returns payments for authenticated tenant", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: true,
      data: {
        userId: "tenant-auth-1",
        role: "tenant",
        organizationId: "org-1",
        capabilities: { canOwnProperties: false },
        memberships: []
      }
    });

    listPaymentsByTenantAuthUserIdMock.mockResolvedValue([
      {
        id: "pay-1",
        organizationId: "org-1",
        leaseId: "lease-1",
        tenantId: "tenant-1",
        amount: 750,
        currencyCode: "USD",
        dueDate: "2026-04-01",
        paidDate: null,
        status: "pending",
        note: null,
        chargePeriod: "2026-04",
        createdAtIso: "2026-03-15T00:00:00.000Z"
      }
    ]);

    const response = await GET(new Request("http://localhost/api/mobile/payments"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.payments).toHaveLength(1);
    expect(json.data.payments[0].id).toBe("pay-1");
    expect(listPaymentsByTenantAuthUserIdMock).toHaveBeenCalledWith("tenant-auth-1", "org-1");
  });
});

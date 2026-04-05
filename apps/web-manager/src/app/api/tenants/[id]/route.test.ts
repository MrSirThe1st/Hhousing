import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  getTenantByIdMock,
  updateTenantMock,
  deleteTenantMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getTenantByIdMock: vi.fn(),
  updateTenantMock: vi.fn(),
  deleteTenantMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createTenantLeaseRepo: (): {
      getTenantById: typeof getTenantByIdMock;
      updateTenant: typeof updateTenantMock;
      deleteTenant: typeof deleteTenantMock;
    } => ({
      getTenantById: getTenantByIdMock,
      updateTenant: updateTenantMock,
      deleteTenant: deleteTenantMock
    })
  };
});

vi.mock("../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

import { GET, PATCH } from "./route";

describe("/api/tenants/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getScopedPortfolioDataMock.mockResolvedValue({
      currentScope: "managed",
      properties: [],
      propertyIds: new Set(),
      unitIds: new Set(),
      leases: [],
      leaseIds: new Set(),
      tenantIds: new Set(["tenant-1"])
    });
  });

  it("rejects tenant-role access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    const response = await GET(new Request("http://localhost/api/tenants/tenant-1"), {
      params: Promise.resolve({ id: "tenant-1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
    expect(getTenantByIdMock).not.toHaveBeenCalled();
  });

  it("returns tenant detail for operators", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "manager",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    getTenantByIdMock.mockResolvedValue({
      id: "tenant-1",
      fullName: "Jean Test"
    });

    const response = await GET(new Request("http://localhost/api/tenants/tenant-1"), {
      params: Promise.resolve({ id: "tenant-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        id: "tenant-1",
        fullName: "Jean Test"
      }
    });
    expect(getTenantByIdMock).toHaveBeenCalledWith("tenant-1", "org-1");
  });

  it("rejects invalid patch payload", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "manager",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    const response = await PATCH(
      new Request("http://localhost/api/tenants/tenant-1", {
        method: "PATCH",
        body: JSON.stringify({ fullName: "   " }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "tenant-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "fullName is required"
    });
    expect(updateTenantMock).not.toHaveBeenCalled();
  });
});
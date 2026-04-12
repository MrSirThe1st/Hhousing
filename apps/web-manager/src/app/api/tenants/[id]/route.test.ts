import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  getTenantByIdMock,
  listLeasesByOrganizationMock,
  updateTenantMock,
  deleteTenantMock,
  requirePermissionMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getTenantByIdMock: vi.fn(),
  listLeasesByOrganizationMock: vi.fn(),
  updateTenantMock: vi.fn(),
  deleteTenantMock: vi.fn(),
  requirePermissionMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createTeamFunctionsRepo: () => ({ listMemberFunctions: vi.fn() }),
    createTenantLeaseRepo: (): {
      getTenantById: typeof getTenantByIdMock;
      listLeasesByOrganization: typeof listLeasesByOrganizationMock;
      updateTenant: typeof updateTenantMock;
      deleteTenant: typeof deleteTenantMock;
    } => ({
      getTenantById: getTenantByIdMock,
      listLeasesByOrganization: listLeasesByOrganizationMock,
      updateTenant: updateTenantMock,
      deleteTenant: deleteTenantMock
    })
  };
});

vi.mock("../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

vi.mock("../../../../api/organizations/permissions", () => ({
  requirePermission: requirePermissionMock
}));

import { GET, PATCH } from "./route";

describe("/api/tenants/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermissionMock.mockResolvedValue({
      success: true,
      data: {
        organizationId: "org-1"
      }
    });
    listLeasesByOrganizationMock.mockResolvedValue([]);
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

  it("returns unassigned tenant detail even when not yet in scoped portfolio", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "manager",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    getScopedPortfolioDataMock.mockResolvedValue({
      currentScope: "managed",
      properties: [],
      propertyIds: new Set(),
      unitIds: new Set(),
      leases: [],
      leaseIds: new Set(),
      tenantIds: new Set()
    });

    getTenantByIdMock.mockResolvedValue({
      id: "tenant-unassigned",
      fullName: "Marie Sans Bail"
    });

    const response = await GET(new Request("http://localhost/api/tenants/tenant-unassigned"), {
      params: Promise.resolve({ id: "tenant-unassigned" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        id: "tenant-unassigned",
        fullName: "Marie Sans Bail"
      }
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
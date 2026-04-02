import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromRequestMock,
  getCurrentLeaseByTenantAuthUserIdMock
} = vi.hoisted(() => ({
  extractAuthSessionFromRequestMock: vi.fn(),
  getCurrentLeaseByTenantAuthUserIdMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromRequest: extractAuthSessionFromRequestMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createTenantLeaseRepo: (): {
      getCurrentLeaseByTenantAuthUserId: typeof getCurrentLeaseByTenantAuthUserIdMock;
    } => ({
      getCurrentLeaseByTenantAuthUserId: getCurrentLeaseByTenantAuthUserIdMock
    })
  };
});

import { GET } from "./route";

describe("/api/mobile/lease", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/mobile/lease"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
    expect(getCurrentLeaseByTenantAuthUserIdMock).not.toHaveBeenCalled();
  });

  it("rejects non-tenant roles", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    const response = await GET(new Request("http://localhost/api/mobile/lease"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "This endpoint is only available to tenants"
    });
    expect(getCurrentLeaseByTenantAuthUserIdMock).not.toHaveBeenCalled();
  });

  it("returns current lease for tenant", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue({
      userId: "tenant-auth-1",
      role: "tenant",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    getCurrentLeaseByTenantAuthUserIdMock.mockResolvedValue({
      id: "lease-1",
      organizationId: "org-1",
      unitId: "unit-1",
      tenantId: "tenant-1",
      startDate: "2026-01-01",
      endDate: null,
      monthlyRentAmount: 750,
      currencyCode: "USD",
      status: "active",
      createdAtIso: "2026-01-01T00:00:00.000Z",
      tenantFullName: "Jean Tenant",
      tenantEmail: "jean@example.com"
    });

    const response = await GET(new Request("http://localhost/api/mobile/lease"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        lease: {
          id: "lease-1",
          organizationId: "org-1",
          unitId: "unit-1",
          tenantId: "tenant-1",
          startDate: "2026-01-01",
          endDate: null,
          monthlyRentAmount: 750,
          currencyCode: "USD",
          status: "active",
          createdAtIso: "2026-01-01T00:00:00.000Z",
          tenantFullName: "Jean Tenant",
          tenantEmail: "jean@example.com"
        }
      }
    });
    expect(getCurrentLeaseByTenantAuthUserIdMock).toHaveBeenCalledWith(
      "tenant-auth-1",
      "org-1"
    );
  });
});

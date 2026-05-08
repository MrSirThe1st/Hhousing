import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractTenantSessionFromRequestMock,
  getCurrentLeaseByTenantAuthUserIdMock,
  getUnitByIdMock,
  getPropertyByIdMock
} = vi.hoisted(() => ({
  extractTenantSessionFromRequestMock: vi.fn(),
  getCurrentLeaseByTenantAuthUserIdMock: vi.fn(),
  getUnitByIdMock: vi.fn(),
  getPropertyByIdMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractTenantSessionFromRequest: extractTenantSessionFromRequestMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createTenantLeaseRepo: (): {
      getCurrentLeaseByTenantAuthUserId: typeof getCurrentLeaseByTenantAuthUserIdMock;
    } => ({
      getCurrentLeaseByTenantAuthUserId: getCurrentLeaseByTenantAuthUserIdMock
    }),
    createRepositoryFromEnv: () => ({
      success: true,
      data: {
        getUnitById: getUnitByIdMock,
        getPropertyById: getPropertyByIdMock
      }
    })
  };
});

import { GET } from "./route";

describe("/api/mobile/lease", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUnitByIdMock.mockResolvedValue(null);
    getPropertyByIdMock.mockResolvedValue(null);
  });

  it("rejects unauthenticated requests", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });

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
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false,
      code: "FORBIDDEN",
      error: "This endpoint is only available to tenants"
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
    getUnitByIdMock.mockResolvedValue({
      id: "unit-1",
      organizationId: "org-1",
      propertyId: "property-1",
      unitNumber: "A-12",
      monthlyRentAmount: 750,
      depositAmount: 750,
      currencyCode: "USD",
      bedroomCount: null,
      bathroomCount: null,
      sizeSqm: null,
      amenities: [],
      features: [],
      status: "occupied",
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });
    getPropertyByIdMock.mockResolvedValue({
      id: "property-1",
      organizationId: "org-1",
      name: "Résidence 30 Juin",
      address: "123 Blvd du 30 Juin",
      city: "Kinshasa",
      countryCode: "CD",
      propertyType: "multi_unit",
      yearBuilt: null,
      photoUrls: ["https://cdn.housing.test/property-1-cover.jpg"],
      ownerId: "owner-1",
      ownerName: "Owner",
      ownerType: "organization",
      managementContext: "managed",
      clientId: null,
      clientName: null,
      status: "active",
      createdAtIso: "2026-01-01T00:00:00.000Z"
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
        },
        rentalAddress: "123 Blvd du 30 Juin, Kinshasa",
        propertyName: "Résidence 30 Juin",
        unitLabel: "A-12",
        rentalPhotoUrl: "https://cdn.housing.test/property-1-cover.jpg"
      }
    });
    expect(getCurrentLeaseByTenantAuthUserIdMock).toHaveBeenCalledWith(
      "tenant-auth-1",
      "org-1"
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@hhousing/api-contracts";
import type { OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { createUnit } from "./create-unit";

const operatorSession: AuthSession = {
  userId: "user-1",
  role: "property_manager",
  organizationId: "org-1",
  capabilities: { canOwnProperties: false },
  memberships: [
    {
      id: "m-1",
      userId: "user-1",
      organizationId: "org-1",
      organizationName: "Org 1",
      role: "property_manager",
      status: "active",
      capabilities: { canOwnProperties: false },
      createdAtIso: "2026-03-31T00:00:00.000Z"
    }
  ]
};

function createRepositoryMock(): OrganizationPropertyUnitRepository {
  return {
    createOrganization: vi.fn(),
    getOrganizationById: vi.fn(),
    updateOrganization: vi.fn(),
    createOwnerClient: vi.fn(),
    createProperty: vi.fn(),
    createPropertyWithUnits: vi.fn(),
    createUnit: vi.fn().mockResolvedValue({
      id: "unt-1",
      organizationId: "org-1",
      propertyId: "prp-1",
      unitNumber: "A1",
      monthlyRentAmount: 500,
      depositAmount: 200,
      currencyCode: "CDF",
      bedroomCount: null,
      bathroomCount: null,
      sizeSqm: null,
      amenities: [],
      features: [],
      status: "vacant",
      createdAtIso: "2026-03-31T00:00:00.000Z"
    }),
    updateProperty: vi.fn(),
    updateUnit: vi.fn(),
    deleteProperty: vi.fn(),
    deleteUnit: vi.fn(),
    getOwnerClientById: vi.fn(),
    getPropertyById: vi.fn().mockResolvedValue({
      id: "prp-1",
      organizationId: "org-1",
      name: "Studio 1",
      address: "Avenue Test",
      city: "Kinshasa",
      countryCode: "CD",
      managementContext: "managed",
      propertyType: "multi_unit",
      yearBuilt: null,
      photoUrls: [],
      clientId: null,
      clientName: null,
      status: "active",
      createdAtIso: "2026-03-31T00:00:00.000Z"
    }),
    getUnitById: vi.fn(),
    listOwnerClients: vi.fn(),
    listPropertiesWithUnits: vi.fn().mockResolvedValue([])
  };
}

describe("createUnit", () => {
  it("rejects adding a second unit to a single-unit property", async () => {
    const repository = createRepositoryMock();
    vi.mocked(repository.getPropertyById).mockResolvedValue({
      id: "prp-1",
      organizationId: "org-1",
      name: "Studio 1",
      address: "Avenue Test",
      city: "Kinshasa",
      countryCode: "CD",
      managementContext: "managed",
      propertyType: "single_unit",
      yearBuilt: null,
      photoUrls: [],
      clientId: null,
      clientName: null,
      status: "active",
      createdAtIso: "2026-03-31T00:00:00.000Z"
    });
    vi.mocked(repository.listPropertiesWithUnits).mockResolvedValue([
      {
        property: {
          id: "prp-1",
          organizationId: "org-1",
          name: "Studio 1",
          address: "Avenue Test",
          city: "Kinshasa",
          countryCode: "CD",
          managementContext: "managed",
          propertyType: "single_unit",
          yearBuilt: null,
          photoUrls: [],
          clientId: null,
          clientName: null,
          status: "active",
          createdAtIso: "2026-03-31T00:00:00.000Z"
        },
        units: [
          {
            id: "unt-existing",
            organizationId: "org-1",
            propertyId: "prp-1",
            unitNumber: "Studio 1",
            monthlyRentAmount: 500,
            depositAmount: 200,
            currencyCode: "CDF",
            bedroomCount: null,
            bathroomCount: null,
            sizeSqm: null,
            amenities: [],
            features: [],
            status: "vacant",
            createdAtIso: "2026-03-31T00:00:00.000Z"
          }
        ]
      }
    ]);

    const response = await createUnit(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          propertyId: "prp-1",
          unitNumber: "A2",
          monthlyRentAmount: 500,
          depositAmount: 200,
          currencyCode: "CDF"
        }
      },
      {
        repository,
        createId: () => "unt-2"
      }
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Single-unit properties cannot have more than one unit"
    });
    expect(repository.createUnit).not.toHaveBeenCalled();
  });

  it("allows creating a unit for a multi-unit property", async () => {
    const repository = createRepositoryMock();

    const response = await createUnit(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          propertyId: "prp-1",
          unitNumber: "A2",
          monthlyRentAmount: 500,
          depositAmount: 200,
          currencyCode: "CDF"
        }
      },
      {
        repository,
        createId: () => "unt-2"
      }
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(repository.createUnit).toHaveBeenCalledTimes(1);
  });
});
import { describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@hhousing/api-contracts";
import type { CreateUnitRecordInput, OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { createProperty } from "./create-property";

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
    createPropertyWithUnits: vi.fn().mockImplementation(async (input) => ({
      property: {
        ...input.property,
        status: "active",
        createdAtIso: "2026-03-31T00:00:00.000Z"
      },
      units: input.units.map((unit: CreateUnitRecordInput) => ({
        ...unit,
        status: "vacant",
        createdAtIso: "2026-03-31T00:00:00.000Z"
      }))
    })),
    createUnit: vi.fn(),
    updateProperty: vi.fn(),
    updateUnit: vi.fn(),
    deleteProperty: vi.fn(),
    deleteUnit: vi.fn(),
    getOwnerClientById: vi.fn().mockResolvedValue({
      id: "ocl-1",
      organizationId: "org-1",
      name: "Client 1",
      createdAtIso: "2026-03-31T00:00:00.000Z"
    }),
    getPropertyById: vi.fn(),
    getUnitById: vi.fn(),
    listOwnerClients: vi.fn(),
    listPropertiesWithUnits: vi.fn()
  };
}

describe("createProperty", () => {
  it("creates a multi-unit property and shared unit records in one call", async () => {
    const repository = createRepositoryMock();
    let counter = 0;

    const response = await createProperty(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          name: "Residence 24",
          address: "Avenue Test",
          city: "Kinshasa",
          countryCode: "CD",
          managementContext: "managed",
          propertyType: "multi_unit",
          yearBuilt: 2020,
          photoUrls: ["https://cdn.test/property-1.jpg"],
          clientId: "ocl-1",
          unitTemplate: {
            monthlyRentAmount: 500,
            depositAmount: 200,
            currencyCode: "CDF",
            bedroomCount: 2,
            bathroomCount: 1.5,
            sizeSqm: 90,
            amenities: ["Parking"],
            features: ["Balcon"],
            unitCount: 3
          }
        }
      },
      {
        repository,
        createId: (prefix: string) => `${prefix}-${++counter}`
      }
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    if (!response.body.success) {
      return;
    }

    expect(response.body.data.units).toHaveLength(3);
    expect(response.body.data.units[0]?.unitNumber).toBe("Residence 24 - Unite 1");
    expect(repository.createPropertyWithUnits).toHaveBeenCalledTimes(1);
    expect(repository.createPropertyWithUnits).toHaveBeenCalledWith(
      expect.objectContaining({
        property: expect.objectContaining({
          id: "prp-1",
          propertyType: "multi_unit",
          photoUrls: ["https://cdn.test/property-1.jpg"]
        }),
        units: expect.arrayContaining([
          expect.objectContaining({ id: "unt-2", propertyId: "prp-1", depositAmount: 200 }),
          expect.objectContaining({ id: "unt-3", propertyId: "prp-1", depositAmount: 200 }),
          expect.objectContaining({ id: "unt-4", propertyId: "prp-1", depositAmount: 200 })
        ])
      })
    );
  });

  it("rejects owned properties linked to a client", async () => {
    const repository = createRepositoryMock();

    const response = await createProperty(
      {
        session: {
          ...operatorSession,
          capabilities: { canOwnProperties: true },
          memberships: [
            {
              ...operatorSession.memberships[0]!,
              capabilities: { canOwnProperties: true }
            }
          ]
        },
        body: {
          organizationId: "org-1",
          name: "Villa",
          address: "Boulevard",
          city: "Kinshasa",
          countryCode: "CD",
          managementContext: "owned",
          propertyType: "single_unit",
          clientId: "ocl-1",
          unitTemplate: {
            monthlyRentAmount: 300,
            depositAmount: 100,
            currencyCode: "CDF"
          }
        }
      },
      {
        repository,
        createId: (prefix: string) => `${prefix}-1`
      }
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Owned properties cannot be linked to a client"
    });
    expect(repository.createPropertyWithUnits).not.toHaveBeenCalled();
  });
});
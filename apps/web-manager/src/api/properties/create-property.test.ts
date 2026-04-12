import { describe, expect, it, vi } from "vitest";
import {
  Permission,
  TeamFunctionCode,
  type AuthSession,
  type TeamFunction
} from "@hhousing/api-contracts";
import type { CreateUnitRecordInput, OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { createProperty } from "./create-property";
import type { TeamPermissionRepository } from "../organizations/permissions";

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
    createOwner: vi.fn(),
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
    getOwnerById: vi.fn().mockResolvedValue({
      id: "own-1",
      organizationId: "org-1",
      name: "Client 1",
      ownerType: "client",
      userId: null,
      createdAtIso: "2026-03-31T00:00:00.000Z"
    }),
    getOwnerClientById: vi.fn().mockResolvedValue({
      id: "ocl-1",
      organizationId: "org-1",
      name: "Client 1",
      ownerType: "client",
      userId: null,
      createdAtIso: "2026-03-31T00:00:00.000Z"
    }),
    getPropertyById: vi.fn(),
    getUnitById: vi.fn(),
    listOwners: vi.fn(),
    listOwnerClients: vi.fn(),
    listPropertiesWithUnits: vi.fn()
  };
}

function createTeamFunctionsRepositoryMock(permissions: string[]): TeamPermissionRepository {
  const functions: TeamFunction[] = permissions.map((permission, index) => ({
    id: `func-${index + 1}`,
    organizationId: "org-1",
    functionCode: TeamFunctionCode.LEASING_AGENT,
    displayName: `Function ${index + 1}`,
    description: null,
    permissions: [permission],
    createdAt: new Date("2026-03-31T00:00:00.000Z")
  }));

  return {
    listMemberFunctions: vi.fn().mockResolvedValue(functions)
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
          ownerId: "own-1",
          propertyType: "multi_unit",
          yearBuilt: 2020,
          photoUrls: ["https://cdn.test/property-1.jpg"],
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
        teamFunctionsRepository: createTeamFunctionsRepositoryMock([Permission.MANAGE_PROPERTIES]),
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

  it("rejects unknown owners", async () => {
    const repository = createRepositoryMock();
    vi.mocked(repository.getOwnerById).mockResolvedValue(null);

    const response = await createProperty(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          name: "Villa",
          address: "Boulevard",
          city: "Kinshasa",
          countryCode: "CD",
          ownerId: "missing-owner",
          propertyType: "single_unit",
          unitTemplate: {
            monthlyRentAmount: 300,
            depositAmount: 100,
            currencyCode: "CDF"
          }
        }
      },
      {
        repository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock([Permission.MANAGE_PROPERTIES]),
        createId: (prefix: string) => `${prefix}-1`
      }
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      code: "NOT_FOUND",
      error: "Owner not found"
    });
    expect(repository.createPropertyWithUnits).not.toHaveBeenCalled();
  });

  it("rejects members without property management permission", async () => {
    const repository = createRepositoryMock();

    const response = await createProperty(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          name: "Residence 24",
          address: "Avenue Test",
          city: "Kinshasa",
          countryCode: "CD",
          ownerId: "own-1",
          propertyType: "single_unit",
          unitTemplate: {
            monthlyRentAmount: 300,
            depositAmount: 100,
            currencyCode: "CDF"
          }
        }
      },
      {
        repository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock([Permission.VIEW_PROPERTIES]),
        createId: (prefix: string) => `${prefix}-1`
      }
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: `Missing permission: ${Permission.MANAGE_PROPERTIES}`
    });
    expect(repository.createPropertyWithUnits).not.toHaveBeenCalled();
  });
});
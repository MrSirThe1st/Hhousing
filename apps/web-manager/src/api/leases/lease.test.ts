import { describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import type { TeamPermissionRepository } from "../organizations/permissions";
import { createLease } from "./lease";

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

function createTeamFunctionsRepositoryMock(permissions: string[]): TeamPermissionRepository {
  return {
    listMemberFunctions: vi.fn().mockResolvedValue([
      {
        id: "fn-1",
        organizationId: "org-1",
        functionCode: "LEASING_AGENT",
        displayName: "Leasing Agent",
        description: null,
        permissions,
        createdAt: new Date("2026-03-31T00:00:00.000Z")
      }
    ])
  };
}

describe("createLease", () => {
  it("creates lease successfully", async () => {
    const repository: TenantLeaseRepository = {
      createLease: vi.fn().mockResolvedValue({
        id: "lease-1",
        organizationId: "org-1",
        unitId: "unit-1",
        tenantId: "tenant-1",
        startDate: "2026-04-01",
        endDate: null,
        monthlyRentAmount: 500,
        currencyCode: "CDF",
        status: "active",
        createdAtIso: "2026-03-31T00:00:00.000Z"
      }),
      createTenant: vi.fn(),
      listLeasesByOrganization: vi.fn(),
      listTenantsByOrganization: vi.fn(),
      getTenantById: vi.fn(),
      getLeaseById: vi.fn(),
      updateTenant: vi.fn(),
      updateLease: vi.fn(),
      deleteTenant: vi.fn()
    };

    const response = await createLease(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          unitId: "unit-1",
          tenantId: "tenant-1",
          startDate: "2026-04-01",
          endDate: null,
          monthlyRentAmount: 500,
          currencyCode: "CDF"
        }
      },
      {
        repository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock(["create_lease"]),
        createId: () => "lease-1"
      }
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(repository.createLease).toHaveBeenCalledTimes(1);
  });

  it("returns validation error when unit is not vacant", async () => {
    const repository: TenantLeaseRepository = {
      createLease: vi.fn().mockRejectedValue(new Error("UNIT_NOT_AVAILABLE")),
      createTenant: vi.fn(),
      listLeasesByOrganization: vi.fn(),
      listTenantsByOrganization: vi.fn(),
      getTenantById: vi.fn(),
      getLeaseById: vi.fn(),
      updateTenant: vi.fn(),
      updateLease: vi.fn(),
      deleteTenant: vi.fn()
    };

    const response = await createLease(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          unitId: "unit-1",
          tenantId: "tenant-1",
          startDate: "2026-04-01",
          endDate: null,
          monthlyRentAmount: 500,
          currencyCode: "CDF"
        }
      },
      {
        repository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock(["create_lease"]),
        createId: () => "lease-1"
      }
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Unit must exist and be vacant before creating a lease"
    });
  });

  it("forbids create when property_manager lacks create_lease permission", async () => {
    const repository: TenantLeaseRepository = {
      createLease: vi.fn(),
      createTenant: vi.fn(),
      listLeasesByOrganization: vi.fn(),
      listTenantsByOrganization: vi.fn(),
      getTenantById: vi.fn(),
      getLeaseById: vi.fn(),
      updateTenant: vi.fn(),
      updateLease: vi.fn(),
      deleteTenant: vi.fn()
    };

    const response = await createLease(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          unitId: "unit-1",
          tenantId: "tenant-1",
          startDate: "2026-04-01",
          endDate: null,
          monthlyRentAmount: 500,
          currencyCode: "CDF"
        }
      },
      {
        repository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock(["view_lease"]),
        createId: () => "lease-1"
      }
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Missing permission: create_lease"
    });
    expect(repository.createLease).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  Permission,
  TeamFunctionCode,
  type AuthSession,
  type TeamFunction
} from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import { createTenant } from "./create-tenant";
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

describe("createTenant", () => {
  it("creates tenant with profile fields", async () => {
    const repository: TenantLeaseRepository = {
      createTenant: vi.fn().mockResolvedValue({
        id: "ten-1",
        organizationId: "org-1",
        authUserId: null,
        fullName: "Jean Test",
        email: "jean@test.com",
        phone: "+243000000",
        dateOfBirth: "1995-04-20",
        photoUrl: "https://cdn.test/tenant.jpg",
        createdAtIso: "2026-03-31T00:00:00.000Z"
      }),
      createLease: vi.fn(),
      revokeActiveTenantInvitations: vi.fn(),
      createTenantInvitation: vi.fn(),
      getTenantInvitationPreviewByTokenHash: vi.fn(),
      markTenantInvitationUsed: vi.fn(),
      linkTenantAuthUser: vi.fn(),
      listLeasesByOrganization: vi.fn(),
      getCurrentLeaseByTenantAuthUserId: vi.fn(),
      listTenantsByOrganization: vi.fn(),
      getTenantById: vi.fn(),
      getLeaseById: vi.fn(),
      getMoveOutByLeaseId: vi.fn(),
      listMoveOutsByOrganization: vi.fn(),
      getLatestLedgerEventId: vi.fn(),
      upsertMoveOut: vi.fn(),
      upsertMoveOutInspection: vi.fn(),
      closeMoveOut: vi.fn(),
      replaceMoveOutCharges: vi.fn(),
      updateTenant: vi.fn(),
      updateLease: vi.fn(),
      deleteTenant: vi.fn()
    };

    const response = await createTenant(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          fullName: "Jean Test",
          email: "jean@test.com",
          phone: "+243000000",
          dateOfBirth: "1995-04-20",
          photoUrl: "https://cdn.test/tenant.jpg"
        }
      },
      {
        repository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock([Permission.MANAGE_TENANTS]),
        createId: () => "ten-1"
      }
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(repository.createTenant).toHaveBeenCalledWith({
      id: "ten-1",
      organizationId: "org-1",
      authUserId: null,
      fullName: "Jean Test",
      email: "jean@test.com",
      phone: "+243000000",
      dateOfBirth: "1995-04-20",
      photoUrl: "https://cdn.test/tenant.jpg",
      employmentStatus: null,
      jobTitle: null,
      monthlyIncome: null,
      numberOfOccupants: null
    });
  });

  it("rejects members without tenant management permission", async () => {
    const repository: TenantLeaseRepository = {
      createTenant: vi.fn(),
      createLease: vi.fn(),
      revokeActiveTenantInvitations: vi.fn(),
      createTenantInvitation: vi.fn(),
      getTenantInvitationPreviewByTokenHash: vi.fn(),
      markTenantInvitationUsed: vi.fn(),
      linkTenantAuthUser: vi.fn(),
      listLeasesByOrganization: vi.fn(),
      getCurrentLeaseByTenantAuthUserId: vi.fn(),
      listTenantsByOrganization: vi.fn(),
      getTenantById: vi.fn(),
      getLeaseById: vi.fn(),
      getMoveOutByLeaseId: vi.fn(),
      listMoveOutsByOrganization: vi.fn(),
      getLatestLedgerEventId: vi.fn(),
      upsertMoveOut: vi.fn(),
      upsertMoveOutInspection: vi.fn(),
      closeMoveOut: vi.fn(),
      replaceMoveOutCharges: vi.fn(),
      updateTenant: vi.fn(),
      updateLease: vi.fn(),
      deleteTenant: vi.fn()
    };

    const response = await createTenant(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          fullName: "Jean Test"
        }
      },
      {
        repository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock([Permission.VIEW_TENANTS]),
        createId: () => "ten-1"
      }
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: `Missing permission: ${Permission.MANAGE_TENANTS}`
    });
    expect(repository.createTenant).not.toHaveBeenCalled();
  });
});
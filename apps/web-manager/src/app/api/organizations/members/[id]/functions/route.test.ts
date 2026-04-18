import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getMembershipByIdMock,
  getMembershipByUserAndOrgMock,
  listMembershipsByOrganizationMock,
  listMemberFunctionsMock,
  listFunctionsByOrganizationMock,
  ensureDefaultFunctionsForOrganizationMock,
  clearMemberFunctionsMock,
  assignFunctionToMemberMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getMembershipByIdMock: vi.fn(),
  getMembershipByUserAndOrgMock: vi.fn(),
  listMembershipsByOrganizationMock: vi.fn(),
  listMemberFunctionsMock: vi.fn(),
  listFunctionsByOrganizationMock: vi.fn(),
  ensureDefaultFunctionsForOrganizationMock: vi.fn(),
  clearMemberFunctionsMock: vi.fn(),
  assignFunctionToMemberMock: vi.fn()
}));

vi.mock("../../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../../shared")>("../../../../shared");

  return {
    ...actual,
    createAuthRepo: () => ({
      getMembershipById: getMembershipByIdMock,
      getMembershipByUserAndOrg: getMembershipByUserAndOrgMock,
      listMembershipsByOrganization: listMembershipsByOrganizationMock
    }),
    createTeamFunctionsRepo: () => ({
      listMemberFunctions: listMemberFunctionsMock,
      listFunctionsByOrganization: listFunctionsByOrganizationMock,
      ensureDefaultFunctionsForOrganization: ensureDefaultFunctionsForOrganizationMock,
      clearMemberFunctions: clearMemberFunctionsMock,
      assignFunctionToMember: assignFunctionToMemberMock
    })
  };
});

import { PATCH } from "./route";

describe("/api/organizations/members/[id]/functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMembershipByIdMock.mockResolvedValue({
      id: "member-2",
      userId: "user-2",
      organizationId: "org-1",
      organizationName: "Org A",
      role: "property_manager",
      status: "active",
      capabilities: { canOwnProperties: false },
      createdAtIso: "2026-02-01T00:00:00.000Z"
    });
    getMembershipByUserAndOrgMock.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      organizationId: "org-1",
      organizationName: "Org A",
      role: "property_manager",
      status: "active",
      capabilities: { canOwnProperties: false },
      createdAtIso: "2026-02-01T00:00:00.000Z"
    });
    listMembershipsByOrganizationMock.mockResolvedValue([
      {
        id: "founder-1",
        userId: "founder-user",
        organizationId: "org-1",
        organizationName: "Org A",
        role: "property_manager",
        status: "active",
        capabilities: { canOwnProperties: false },
        createdAtIso: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "member-1",
        userId: "user-1",
        organizationId: "org-1",
        organizationName: "Org A",
        role: "property_manager",
        status: "active",
        capabilities: { canOwnProperties: false },
        createdAtIso: "2026-02-01T00:00:00.000Z"
      }
    ]);
    listMemberFunctionsMock.mockResolvedValue([]);
    listFunctionsByOrganizationMock.mockResolvedValue([
      {
        id: "fn-accountant",
        organizationId: "org-1",
        functionCode: "ACCOUNTANT",
        displayName: "Accountant",
        description: null,
        permissions: ["view_payments"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      },
      {
        id: "fn-admin",
        organizationId: "org-1",
        functionCode: "ADMIN",
        displayName: "Admin",
        description: null,
        permissions: ["*", "manage_team"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);
    clearMemberFunctionsMock.mockResolvedValue(undefined);
    ensureDefaultFunctionsForOrganizationMock.mockResolvedValue(undefined);
    assignFunctionToMemberMock.mockResolvedValue({
      id: "mf-1",
      organizationId: "org-1",
      memberId: "member-2",
      functionId: "fn-accountant",
      assignedBy: "user-1",
      createdAt: new Date("2026-02-02T00:00:00.000Z")
    });
  });

  it("allows an account-owner landlord to assign admin access", async () => {
    getMembershipByUserAndOrgMock.mockResolvedValue({
      id: "owner-landlord",
      userId: "landlord-1",
      organizationId: "org-1",
      organizationName: "Org A",
      role: "landlord",
      status: "active",
      capabilities: { canOwnProperties: true },
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });
    listMembershipsByOrganizationMock.mockResolvedValue([
      {
        id: "owner-landlord",
        userId: "landlord-1",
        organizationId: "org-1",
        organizationName: "Org A",
        role: "landlord",
        status: "active",
        capabilities: { canOwnProperties: true },
        createdAtIso: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "member-2",
        userId: "user-2",
        organizationId: "org-1",
        organizationName: "Org A",
        role: "property_manager",
        status: "active",
        capabilities: { canOwnProperties: false },
        createdAtIso: "2026-02-01T00:00:00.000Z"
      }
    ]);

    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "landlord-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    const response = await PATCH(
      new Request("http://localhost/api/organizations/members/member-2/functions", {
        method: "PATCH",
        body: JSON.stringify({ functions: ["ADMIN"] }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "member-2" }) }
    );

    expect(response.status).toBe(200);
    expect(clearMemberFunctionsMock).toHaveBeenCalledWith("member-2");
    expect(assignFunctionToMemberMock).toHaveBeenCalledWith(
      "member-2",
      "fn-admin",
      "org-1",
      "landlord-1"
    );
  });

  it("allows a property manager with manage_team to assign non-admin roles", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });
    listMemberFunctionsMock.mockResolvedValue([
      {
        id: "fn-admin",
        organizationId: "org-1",
        functionCode: "ADMIN",
        displayName: "Admin",
        description: null,
        permissions: ["*", "manage_team"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);

    const response = await PATCH(
      new Request("http://localhost/api/organizations/members/member-2/functions", {
        method: "PATCH",
        body: JSON.stringify({ functions: ["ACCOUNTANT"] }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "member-2" }) }
    );

    expect(response.status).toBe(200);
    expect(assignFunctionToMemberMock).toHaveBeenCalledWith(
      "member-2",
      "fn-accountant",
      "org-1",
      "user-1"
    );
  });

  it("allows an account-owner property manager to assign admin access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "founder-user",
      role: "property_manager",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });
    listMemberFunctionsMock.mockResolvedValue([
      {
        id: "fn-admin",
        organizationId: "org-1",
        functionCode: "ADMIN",
        displayName: "Admin",
        description: null,
        permissions: ["*", "manage_team"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);

    const response = await PATCH(
      new Request("http://localhost/api/organizations/members/member-2/functions", {
        method: "PATCH",
        body: JSON.stringify({ functions: ["ADMIN"] }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "member-2" }) }
    );

    expect(response.status).toBe(200);
    expect(assignFunctionToMemberMock).toHaveBeenCalledWith(
      "member-2",
      "fn-admin",
      "org-1",
      "founder-user"
    );
  });

  it("blocks non-owner property manager without org-admin authority from assigning admin access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });
    listMemberFunctionsMock.mockResolvedValue([
      {
        id: "fn-team-manager",
        organizationId: "org-1",
        functionCode: "LEASING_AGENT",
        displayName: "Property Manager",
        description: null,
        permissions: ["manage_team"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);

    const response = await PATCH(
      new Request("http://localhost/api/organizations/members/member-2/functions", {
        method: "PATCH",
        body: JSON.stringify({ functions: ["ADMIN"] }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "member-2" }) }
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Only the account owner or an organization admin can assign the ADMIN function"
    });
    expect(clearMemberFunctionsMock).not.toHaveBeenCalled();
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  listMembershipsByOrganizationMock,
  getMembershipByUserAndOrgMock,
  createOrganizationMembershipMock,
  listFunctionsByOrganizationMock,
  assignFunctionToMemberMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  listMembershipsByOrganizationMock: vi.fn(),
  getMembershipByUserAndOrgMock: vi.fn(),
  createOrganizationMembershipMock: vi.fn(),
  listFunctionsByOrganizationMock: vi.fn(),
  assignFunctionToMemberMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createAuthRepo: (): {
      listMembershipsByOrganization: typeof listMembershipsByOrganizationMock;
      getMembershipByUserAndOrg: typeof getMembershipByUserAndOrgMock;
      createOrganizationMembership: typeof createOrganizationMembershipMock;
    } => ({
      listMembershipsByOrganization: listMembershipsByOrganizationMock,
      getMembershipByUserAndOrg: getMembershipByUserAndOrgMock,
      createOrganizationMembership: createOrganizationMembershipMock
    }),
    createTeamFunctionsRepo: (): {
      listFunctionsByOrganization: typeof listFunctionsByOrganizationMock;
      assignFunctionToMember: typeof assignFunctionToMemberMock;
    } => ({
      listFunctionsByOrganization: listFunctionsByOrganizationMock,
      assignFunctionToMember: assignFunctionToMemberMock
    })
  };
});

import { GET, POST } from "./route";

describe("/api/organizations/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFunctionsByOrganizationMock.mockResolvedValue([
      {
        id: "fn-leasing",
        organizationId: "org-1",
        functionCode: "LEASING_AGENT",
        displayName: "Leasing Agent",
        description: "Leases and tenants",
        permissions: ["create_lease"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      },
      {
        id: "fn-accounting",
        organizationId: "org-1",
        functionCode: "ACCOUNTANT",
        displayName: "Accountant",
        description: "Payments and exports",
        permissions: ["view_payments"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      },
      {
        id: "fn-admin",
        organizationId: "org-1",
        functionCode: "ADMIN",
        displayName: "Admin",
        description: "Full access",
        permissions: ["*"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);
  });

  it("rejects tenant access on get", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    const response = await GET(
      new Request("http://localhost/api/organizations/members?organizationId=org-1")
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
    expect(listMembershipsByOrganizationMock).not.toHaveBeenCalled();
  });

  it("lists organization members for operators", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    listMembershipsByOrganizationMock.mockResolvedValue([
      {
        id: "m-1",
        userId: "user-1",
        organizationId: "org-1",
        organizationName: "Org A",
        role: "landlord",
        status: "active",
        capabilities: { canOwnProperties: true },
        createdAtIso: "2026-01-01T00:00:00.000Z"
      }
    ]);

    const response = await GET(
      new Request("http://localhost/api/organizations/members?organizationId=org-1")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        memberships: [
          {
            id: "m-1",
            userId: "user-1",
            organizationId: "org-1",
            organizationName: "Org A",
            role: "landlord",
            status: "active",
            capabilities: { canOwnProperties: true },
            createdAtIso: "2026-01-01T00:00:00.000Z"
          }
        ]
      }
    });
    expect(listMembershipsByOrganizationMock).toHaveBeenCalledWith("org-1");
  });

  it("rejects invalid invite payload", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    const response = await POST(
      new Request("http://localhost/api/organizations/members", {
        method: "POST",
        body: JSON.stringify({ userId: "   " }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "userId is required"
    });
    expect(createOrganizationMembershipMock).not.toHaveBeenCalled();
  });

  it("invites property manager with functions for landlord", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    getMembershipByUserAndOrgMock.mockResolvedValue(null);
    createOrganizationMembershipMock.mockResolvedValue({
      id: "m-2",
      userId: "user-2",
      organizationId: "org-1",
      organizationName: "Org A",
      role: "property_manager",
      status: "active",
      capabilities: { canOwnProperties: false },
      createdAtIso: "2026-01-02T00:00:00.000Z"
    });

    const response = await POST(
      new Request("http://localhost/api/organizations/members", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-2",
          role: "property_manager",
          canOwnProperties: false,
          functions: ["LEASING_AGENT", "ACCOUNTANT"]
        }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        id: "m-2",
        userId: "user-2",
        organizationId: "org-1",
        organizationName: "Org A",
        role: "property_manager",
        status: "active",
        capabilities: { canOwnProperties: false },
        createdAtIso: "2026-01-02T00:00:00.000Z"
      }
    });
    expect(getMembershipByUserAndOrgMock).toHaveBeenCalledWith("user-2", "org-1");
    expect(createOrganizationMembershipMock).toHaveBeenCalledTimes(1);
    expect(assignFunctionToMemberMock).toHaveBeenCalledTimes(2);
  });

  it("allows property_manager to invite property_manager", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-10",
      role: "property_manager",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    getMembershipByUserAndOrgMock.mockResolvedValue(null);
    createOrganizationMembershipMock.mockResolvedValue({
      id: "m-3",
      userId: "user-3",
      organizationId: "org-1",
      organizationName: "Org A",
      role: "property_manager",
      status: "active",
      capabilities: { canOwnProperties: false },
      createdAtIso: "2026-01-03T00:00:00.000Z"
    });

    const response = await POST(
      new Request("http://localhost/api/organizations/members", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-3",
          role: "property_manager",
          canOwnProperties: false,
          functions: ["ACCOUNTANT"]
        }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(201);
    expect(createOrganizationMembershipMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: "property_manager" })
    );
    expect(assignFunctionToMemberMock).toHaveBeenCalledWith(
      "m-3",
      "fn-accounting",
      "org-1",
      "user-10"
    );
  });

  it("blocks property_manager inviting landlord", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-10",
      role: "property_manager",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    getMembershipByUserAndOrgMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/organizations/members", {
        method: "POST",
        body: JSON.stringify({ userId: "user-4", role: "landlord", canOwnProperties: true }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Property managers cannot invite landlords"
    });
    expect(createOrganizationMembershipMock).not.toHaveBeenCalled();
  });

  it("blocks property_manager assigning admin function", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-10",
      role: "property_manager",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    getMembershipByUserAndOrgMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/organizations/members", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-5",
          role: "property_manager",
          canOwnProperties: false,
          functions: ["ADMIN"]
        }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Only landlords can assign the ADMIN function"
    });
    expect(createOrganizationMembershipMock).not.toHaveBeenCalled();
    expect(assignFunctionToMemberMock).not.toHaveBeenCalled();
  });

  it("requires at least one function for property_manager invites", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    getMembershipByUserAndOrgMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/organizations/members", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-6",
          role: "property_manager",
          canOwnProperties: false,
          functions: []
        }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Select at least one function for a property manager"
    });
    expect(createOrganizationMembershipMock).not.toHaveBeenCalled();
  });
});

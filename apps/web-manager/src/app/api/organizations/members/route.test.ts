import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  listMembershipsByOrganizationMock,
  revokeActiveTeamMemberInvitationsMock,
  createTeamMemberInvitationMock,
  sendTeamMemberInvitationEmailMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  listMembershipsByOrganizationMock: vi.fn(),
  revokeActiveTeamMemberInvitationsMock: vi.fn(),
  createTeamMemberInvitationMock: vi.fn(),
  sendTeamMemberInvitationEmailMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../lib/email/resend", () => ({
  createTeamMemberInvitationEmailSenderFromEnv: (): typeof sendTeamMemberInvitationEmailMock =>
    sendTeamMemberInvitationEmailMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createAuthRepo: (): {
      listMembershipsByOrganization: typeof listMembershipsByOrganizationMock;
      revokeActiveTeamMemberInvitations: typeof revokeActiveTeamMemberInvitationsMock;
      createTeamMemberInvitation: typeof createTeamMemberInvitationMock;
    } => ({
      listMembershipsByOrganization: listMembershipsByOrganizationMock,
      revokeActiveTeamMemberInvitations: revokeActiveTeamMemberInvitationsMock,
      createTeamMemberInvitation: createTeamMemberInvitationMock
    })
  };
});

import { GET, POST } from "./route";

describe("/api/organizations/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it("lists operator members and excludes tenants", async () => {
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
      },
      {
        id: "m-tenant",
        userId: "user-tenant",
        organizationId: "org-1",
        organizationName: "Org A",
        role: "tenant",
        status: "active",
        capabilities: { canOwnProperties: false },
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
        body: JSON.stringify({ email: "   " }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "email is required"
    });
    expect(createTeamMemberInvitationMock).not.toHaveBeenCalled();
  });

  it("creates and emails a team invitation", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    createTeamMemberInvitationMock.mockResolvedValue({
      id: "tmi-1",
      organizationId: "org-1",
      organizationName: "Org A",
      email: "manager@example.com",
      role: "property_manager",
      canOwnProperties: false,
      expiresAtIso: "2026-01-08T00:00:00.000Z",
      usedAtIso: null,
      revokedAtIso: null,
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });

    const response = await POST(
      new Request("http://localhost/api/organizations/members", {
        method: "POST",
        body: JSON.stringify({
          email: "manager@example.com",
          canOwnProperties: false
        }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        invitationId: "tmi-1",
        email: "manager@example.com",
        role: "property_manager",
        canOwnProperties: false,
        expiresAtIso: "2026-01-08T00:00:00.000Z",
        activationLink: expect.stringContaining("http://localhost:3000/team-invite?token=")
      }
    });
    expect(revokeActiveTeamMemberInvitationsMock).toHaveBeenCalledWith(
      "manager@example.com",
      "org-1"
    );
    expect(sendTeamMemberInvitationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "manager@example.com",
        organizationName: "Org A"
      })
    );
  });

  it("rejects invalid role overrides", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-10",
      role: "property_manager",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    const response = await POST(
      new Request("http://localhost/api/organizations/members", {
        method: "POST",
        body: JSON.stringify({
          email: "owner@example.com",
          role: "landlord"
        }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "role must be property_manager"
    });
  });
});
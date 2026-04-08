import { beforeEach, describe, expect, it, vi } from "vitest";

const { validateTeamMemberInvitationMock } = vi.hoisted(() => ({
  validateTeamMemberInvitationMock: vi.fn()
}));

vi.mock("../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../api")>("../../../../../api");
  return {
    ...actual,
    validateTeamMemberInvitation: validateTeamMemberInvitationMock
  };
});

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createAuthRepo: () => ({})
  };
});

import { GET } from "./route";

describe("/api/auth/team-invitations/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error for missing token", async () => {
    validateTeamMemberInvitationMock.mockResolvedValue({
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "token is required" }
    });

    const response = await GET(new Request("http://localhost/api/auth/team-invitations/validate"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "token is required"
    });
  });

  it("returns invitation preview", async () => {
    validateTeamMemberInvitationMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          invitation: {
            invitationId: "tmi-1",
            organizationId: "org-1",
            organizationName: "Org 1",
            email: "manager@example.com",
            role: "property_manager",
            canOwnProperties: false,
            expiresAtIso: "2026-04-09T00:00:00.000Z"
          }
        }
      }
    });

    const response = await GET(
      new Request("http://localhost/api/auth/team-invitations/validate?token=abc")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        invitation: {
          invitationId: "tmi-1",
          organizationId: "org-1",
          organizationName: "Org 1",
          email: "manager@example.com",
          role: "property_manager",
          canOwnProperties: false,
          expiresAtIso: "2026-04-09T00:00:00.000Z"
        }
      }
    });
  });
});
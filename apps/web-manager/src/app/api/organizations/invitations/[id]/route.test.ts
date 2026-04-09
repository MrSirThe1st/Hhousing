import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  resendTeamMemberInvitationMock,
  revokeTeamMemberInvitationMock,
  extractAuthSessionFromCookiesMock
} = vi.hoisted(() => ({
  resendTeamMemberInvitationMock: vi.fn(),
  revokeTeamMemberInvitationMock: vi.fn(),
  extractAuthSessionFromCookiesMock: vi.fn()
}));

vi.mock("../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../api")>("../../../../../api");
  return {
    ...actual,
    resendTeamMemberInvitation: resendTeamMemberInvitationMock,
    revokeTeamMemberInvitation: revokeTeamMemberInvitationMock
  };
});

vi.mock("../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createAuthRepo: () => ({}),
    createTeamFunctionsRepo: () => ({})
  };
});

vi.mock("../../../../../lib/email/resend", () => ({
  createTeamMemberInvitationEmailSenderFromEnv: () => vi.fn()
}));

import { DELETE, POST } from "./route";

describe("/api/organizations/invitations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractAuthSessionFromCookiesMock.mockResolvedValue(null);
  });

  it("resends an invitation", async () => {
    resendTeamMemberInvitationMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          invitationId: "tmi-1",
          email: "manager@example.com",
          role: "property_manager",
          canOwnProperties: false,
          expiresAtIso: "2026-04-16T00:00:00.000Z",
          activationLink: "https://harakaproperty.com/team-invite?token=abc"
        }
      }
    });

    const response = await POST(new Request("http://localhost/api/organizations/invitations/tmi-1"), {
      params: Promise.resolve({ id: "tmi-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        invitationId: "tmi-1",
        email: "manager@example.com",
        role: "property_manager",
        canOwnProperties: false,
        expiresAtIso: "2026-04-16T00:00:00.000Z",
        activationLink: "https://harakaproperty.com/team-invite?token=abc"
      }
    });
  });

  it("revokes an invitation", async () => {
    revokeTeamMemberInvitationMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: { invitationId: "tmi-1" }
      }
    });

    const response = await DELETE(new Request("http://localhost/api/organizations/invitations/tmi-1"), {
      params: Promise.resolve({ id: "tmi-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { invitationId: "tmi-1" }
    });
  });
});
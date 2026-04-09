import { beforeEach, describe, expect, it, vi } from "vitest";

const { acceptTeamMemberInvitationMock } = vi.hoisted(() => ({
  acceptTeamMemberInvitationMock: vi.fn()
}));

const { extractAuthSessionFromCookiesMock } = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn()
}));

vi.mock("../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../api")>("../../../../../api");
  return {
    ...actual,
    acceptTeamMemberInvitation: acceptTeamMemberInvitationMock
  };
});

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createAuthRepo: () => ({})
  };
});

vi.mock("../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

import { POST } from "./route";

describe("/api/auth/team-invitations/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractAuthSessionFromCookiesMock.mockResolvedValue(null);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  it("rejects invalid json", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/team-invitations/accept", {
        method: "POST",
        body: "{"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  });

  it("returns activation success", async () => {
    acceptTeamMemberInvitationMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          userId: "user-1",
          organizationId: "org-1",
          membershipId: "mem-1"
        }
      }
    });

    const response = await POST(
      new Request("http://localhost/api/auth/team-invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "abc", fullName: "Jean Team", password: "password123" })
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        userId: "user-1",
        organizationId: "org-1",
        membershipId: "mem-1"
      }
    });
  });
});
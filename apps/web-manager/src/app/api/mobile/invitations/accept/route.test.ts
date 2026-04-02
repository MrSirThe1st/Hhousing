import { beforeEach, describe, expect, it, vi } from "vitest";

const { acceptTenantInvitationMock } = vi.hoisted(() => ({
  acceptTenantInvitationMock: vi.fn()
}));

vi.mock("../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../api")>("../../../../../api");
  return {
    ...actual,
    acceptTenantInvitation: acceptTenantInvitationMock
  };
});

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createTenantLeaseRepo: () => ({}),
    createAuthRepo: () => ({})
  };
});

import { POST } from "./route";

describe("/api/mobile/invitations/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid json", async () => {
    const response = await POST(
      new Request("http://localhost/api/mobile/invitations/accept", {
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
    acceptTenantInvitationMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          tenantId: "tenant-1",
          userId: "user-1",
          organizationId: "org-1",
          membershipId: "mem-1"
        }
      }
    });

    const response = await POST(
      new Request("http://localhost/api/mobile/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "abc", password: "password123" })
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        tenantId: "tenant-1",
        userId: "user-1",
        organizationId: "org-1",
        membershipId: "mem-1"
      }
    });
  });
});
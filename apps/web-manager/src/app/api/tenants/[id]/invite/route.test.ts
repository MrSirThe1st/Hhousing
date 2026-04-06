import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  createTenantInvitationMock,
  createTenantInvitationEmailSenderFromEnvMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  createTenantInvitationMock: vi.fn(),
  createTenantInvitationEmailSenderFromEnvMock: vi.fn()
}));

vi.mock("../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../api")>("../../../../../api");
  return {
    ...actual,
    createTenantInvitation: createTenantInvitationMock
  };
});

vi.mock("../../../../../lib/email/resend", () => ({
  createTenantInvitationEmailSenderFromEnv: createTenantInvitationEmailSenderFromEnvMock
}));

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createTenantLeaseRepo: () => ({})
  };
});

import { POST } from "./route";

describe("/api/tenants/[id]/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createTenantInvitationEmailSenderFromEnvMock.mockReturnValue(vi.fn().mockResolvedValue(undefined));
  });

  it("forwards auth session and tenant id", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });
    createTenantInvitationMock.mockResolvedValue({
      status: 201,
      body: {
        success: true,
        data: {
          invitationId: "tin-1",
          tenantId: "tenant-1",
          email: "tenant@example.com",
          expiresAtIso: "2026-04-09T00:00:00.000Z",
          activationLink: "hhousing-tenant://accept-invite?token=abc"
        }
      }
    });

    const response = await POST(new Request("http://localhost/api/tenants/tenant-1/invite", { method: "POST" }), {
      params: Promise.resolve({ id: "tenant-1" })
    });

    expect(response.status).toBe(201);
    expect(createTenantInvitationMock).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        invitationId: "tin-1",
        tenantId: "tenant-1",
        email: "tenant@example.com",
        expiresAtIso: "2026-04-09T00:00:00.000Z",
        activationLink: "hhousing-tenant://accept-invite?token=abc"
      }
    });
  });
});
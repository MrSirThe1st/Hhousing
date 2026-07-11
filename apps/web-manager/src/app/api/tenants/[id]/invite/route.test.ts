import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  createTenantInvitationMock,
  createTenantInvitationNotificationDepsFromEnvMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  createTenantInvitationMock: vi.fn(),
  createTenantInvitationNotificationDepsFromEnvMock: vi.fn()
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

vi.mock("../../../../../lib/notifications/tenant-invitation-notifiers", () => ({
  createTenantInvitationNotificationDepsFromEnv: createTenantInvitationNotificationDepsFromEnvMock
}));

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createTenantLeaseRepo: () => ({}),
    createTeamFunctionsRepo: () => ({ listMemberFunctions: vi.fn() }),
    createRepositoryFromEnv: () => ({ success: false, error: "missing env" })
  };
});

import { POST } from "./route";

describe("/api/tenants/[id]/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createTenantInvitationNotificationDepsFromEnvMock.mockReturnValue({
      sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
      notificationChannels: ["email", "whatsapp"]
    });
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
          activationLink: "hhousing-tenant://accept-invite?token=abc",
          notifications: [{ channel: "email", status: "sent" }]
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
        activationLink: "hhousing-tenant://accept-invite?token=abc",
        notifications: [{ channel: "email", status: "sent" }]
      }
    });
  });
});
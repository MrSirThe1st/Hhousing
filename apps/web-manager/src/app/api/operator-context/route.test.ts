import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getServerOperatorContextMock,
  isAccountOwnerMock,
  createRepositoryFromEnvMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getServerOperatorContextMock: vi.fn(),
  isAccountOwnerMock: vi.fn(),
  createRepositoryFromEnvMock: vi.fn()
}));

vi.mock("../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../lib/operator-context", () => ({
  getServerOperatorContext: getServerOperatorContextMock,
  isAccountOwner: isAccountOwnerMock
}));

vi.mock("../shared", () => ({
  jsonResponse: (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json"
      }
    }),
  createRepositoryFromEnv: createRepositoryFromEnvMock,
  parseJsonBody: async (request: Request) => request.json()
}));

vi.mock("../../../api/shared", () => ({
  requireOperatorSession: (session: unknown) =>
    session
      ? { success: true, data: session }
      : { success: false, code: "UNAUTHORIZED", error: "Authentication required" },
  mapErrorCodeToHttpStatus: (code: string) => (code === "FORBIDDEN" ? 403 : 400)
}));

import { GET, PATCH } from "./route";

describe("/api/operator-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current operator context", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });
    getServerOperatorContextMock.mockResolvedValue({
      experience: "entreprise"
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.experience).toBe("entreprise");
  });

  it("updates platform experience for account owner", async () => {
    const session = {
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: true },
      memberships: [{ id: "mem_1", organizationId: "org_1" }]
    };
    extractAuthSessionFromCookiesMock.mockResolvedValue(session);
    isAccountOwnerMock.mockResolvedValue(true);
    createRepositoryFromEnvMock.mockReturnValue({
      success: true,
      data: {
        updateOrganizationPlatformExperience: vi.fn().mockResolvedValue({
          id: "org_1",
          platformExperience: "individual"
        })
      }
    });
    getServerOperatorContextMock.mockResolvedValue({
      experience: "individual"
    });

    const response = await PATCH(
      new Request("http://localhost/api/operator-context", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platformExperience: "individual" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.experience).toBe("individual");
  });

  it("rejects experience update from non-owner", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });
    isAccountOwnerMock.mockResolvedValue(false);

    const response = await PATCH(
      new Request("http://localhost/api/operator-context", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platformExperience: "individual" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getServerOperatorContextMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getServerOperatorContextMock: vi.fn()
}));

vi.mock("../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../lib/operator-context", () => ({
  getServerOperatorContext: getServerOperatorContextMock
}));

vi.mock("../shared", () => ({
  jsonResponse: (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json"
      }
    })
}));

import { GET, POST } from "./route";

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
      experience: "mixed_operator"
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.experience).toBe("mixed_operator");
  });

  it("rejects scope update since switching was removed", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    const response = await POST(new Request("http://localhost/api/operator-context", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.code).toBe("METHOD_NOT_ALLOWED");
  });
});
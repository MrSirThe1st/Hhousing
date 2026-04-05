import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  parseJsonBodyMock,
  cookiesMock,
  getServerOperatorContextMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  cookiesMock: vi.fn(),
  getServerOperatorContextMock: vi.fn()
}));

vi.mock("../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock
}));

vi.mock("../../../lib/operator-context", () => ({
  OPERATOR_SCOPE_COOKIE: "hh_operator_scope",
  isOperatorScope: (value: unknown) => value === "owned" || value === "managed",
  isScopeAllowedForSession: (session: { capabilities?: { canOwnProperties?: boolean }; role?: string }, scope: string) => {
    if (session.role === "landlord") {
      return scope === "owned";
    }

    if (session.capabilities?.canOwnProperties) {
      return scope === "owned" || scope === "managed";
    }

    return scope === "managed";
  },
  getServerOperatorContext: getServerOperatorContextMock
}));

vi.mock("../shared", () => ({
  parseJsonBody: parseJsonBodyMock,
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
      experience: "mixed_operator",
      availableScopes: ["owned", "managed"],
      currentScope: "owned",
      canSwitch: true
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.currentScope).toBe("owned");
  });

  it("rejects unauthorized scope update", async () => {
    parseJsonBodyMock.mockResolvedValue({ scope: "owned" });
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    const response = await POST(new Request("http://localhost/api/operator-context", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("stores allowed scope update", async () => {
    const setMock = vi.fn();
    cookiesMock.mockResolvedValue({ set: setMock });
    parseJsonBodyMock.mockResolvedValue({ scope: "managed" });
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });
    getServerOperatorContextMock.mockResolvedValue({
      experience: "mixed_operator",
      availableScopes: ["owned", "managed"],
      currentScope: "managed",
      canSwitch: true
    });

    const response = await POST(new Request("http://localhost/api/operator-context", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(body.data.currentScope).toBe("managed");
  });
});
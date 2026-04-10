import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractAuthSessionFromCookiesMock, getSidebarBadgeCountsMock } = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getSidebarBadgeCountsMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../lib/sidebar-badge-counts", () => ({
  getSidebarBadgeCounts: getSidebarBadgeCountsMock
}));

import { GET } from "./route";

describe("/api/sidebar/badge-counts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });
    getSidebarBadgeCountsMock.mockResolvedValue({
      listings: 3,
      payments: 2,
      maintenance: 5,
      messages: 7
    });
  });

  it("returns badge counts for operator sessions", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getSidebarBadgeCountsMock).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1" }));
    expect(body).toEqual({
      success: true,
      data: {
        listings: 3,
        payments: 2,
        maintenance: 5,
        messages: 7
      }
    });
  });

  it("rejects unauthenticated requests", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHORIZED");
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  listTenantsMock,
  createTenantLeaseRepoMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  listTenantsMock: vi.fn(),
  createTenantLeaseRepoMock: vi.fn(() => ({ stub: true }))
}));

vi.mock("../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../api")>("../../../api");

  return {
    ...actual,
    listTenants: listTenantsMock
  };
});

vi.mock("../shared", async () => {
  const actual = await vi.importActual<typeof import("../shared")>("../shared");

  return {
    ...actual,
    createTenantLeaseRepo: createTenantLeaseRepoMock
  };
});

import { GET } from "./route";

describe("/api/tenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createTenantLeaseRepoMock.mockReturnValue({ stub: true });
  });

  it("returns all organization tenants without scope filtering", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "manager",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    listTenantsMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          tenants: [
            { id: "tenant-1", fullName: "Jean Test" },
            { id: "tenant-2", fullName: "Marie Test" }
          ]
        }
      }
    });

    const response = await GET(new Request("http://localhost/api/tenants?organizationId=org-1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        tenants: [
          { id: "tenant-1", fullName: "Jean Test" },
          { id: "tenant-2", fullName: "Marie Test" }
        ]
      }
    });
    expect(listTenantsMock).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        session: {
          userId: "user-1",
          role: "manager",
          organizationId: "org-1",
          membershipId: "membership-1"
        }
      },
      expect.any(Object)
    );
  });
});

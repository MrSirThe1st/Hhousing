import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getLeaseByIdMock,
  updateLeaseMock,
  listMemberFunctionsMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getLeaseByIdMock: vi.fn(),
  updateLeaseMock: vi.fn(),
  listMemberFunctionsMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createTenantLeaseRepo: (): {
      getLeaseById: typeof getLeaseByIdMock;
      updateLease: typeof updateLeaseMock;
    } => ({
      getLeaseById: getLeaseByIdMock,
      updateLease: updateLeaseMock
    }),
    createTeamFunctionsRepo: (): {
      listMemberFunctions: typeof listMemberFunctionsMock;
    } => ({
      listMemberFunctions: listMemberFunctionsMock
    })
  };
});

import { GET, PATCH } from "./route";

describe("/api/leases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMemberFunctionsMock.mockResolvedValue([
      {
        id: "fn-lease",
        organizationId: "org-1",
        functionCode: "LEASING_AGENT",
        displayName: "Leasing Agent",
        description: null,
        permissions: ["view_lease", "edit_lease"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);
  });

  it("rejects tenant-role access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      memberships: []
    });

    const response = await GET(new Request("http://localhost/api/leases/lease-1"), {
      params: Promise.resolve({ id: "lease-1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
    expect(getLeaseByIdMock).not.toHaveBeenCalled();
  });

  it("returns lease detail for operators", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      memberships: [
        {
          id: "membership-1",
          userId: "user-1",
          organizationId: "org-1",
          organizationName: "Org A",
          role: "property_manager",
          status: "active",
          capabilities: { canOwnProperties: false },
          createdAtIso: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      status: "active"
    });

    const response = await GET(new Request("http://localhost/api/leases/lease-1"), {
      params: Promise.resolve({ id: "lease-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        id: "lease-1",
        status: "active"
      }
    });
    expect(getLeaseByIdMock).toHaveBeenCalledWith("lease-1", "org-1");
  });

  it("rejects invalid patch payload", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      memberships: [
        {
          id: "membership-1",
          userId: "user-1",
          organizationId: "org-1",
          organizationName: "Org A",
          role: "property_manager",
          status: "active",
          capabilities: { canOwnProperties: false },
          createdAtIso: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1", {
        method: "PATCH",
        body: JSON.stringify({ endDate: "2026/01/01", status: "paused" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "endDate must be YYYY-MM-DD or null"
    });
    expect(updateLeaseMock).not.toHaveBeenCalled();
  });

  it("rejects property_manager without view_lease permission", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      memberships: [
        {
          id: "membership-1",
          userId: "user-1",
          organizationId: "org-1",
          organizationName: "Org A",
          role: "property_manager",
          status: "active",
          capabilities: { canOwnProperties: false },
          createdAtIso: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    listMemberFunctionsMock.mockResolvedValue([
      {
        id: "fn-accountant",
        organizationId: "org-1",
        functionCode: "ACCOUNTANT",
        displayName: "Accountant",
        description: null,
        permissions: ["view_payments"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);

    const response = await GET(new Request("http://localhost/api/leases/lease-1"), {
      params: Promise.resolve({ id: "lease-1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Missing permission: view_lease"
    });
    expect(getLeaseByIdMock).not.toHaveBeenCalled();
  });
});
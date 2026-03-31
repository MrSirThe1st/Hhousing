import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getMaintenanceRequestByIdMock,
  listMaintenanceRequestTimelineMock,
  updateMaintenanceRequestMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getMaintenanceRequestByIdMock: vi.fn(),
  listMaintenanceRequestTimelineMock: vi.fn(),
  updateMaintenanceRequestMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../api")>("../../../../api");

  return {
    ...actual,
    updateMaintenanceRequest: updateMaintenanceRequestMock
  };
});

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createMaintenanceRepo: (): {
      getMaintenanceRequestById: typeof getMaintenanceRequestByIdMock;
      listMaintenanceRequestTimeline: typeof listMaintenanceRequestTimelineMock;
    } => ({
      getMaintenanceRequestById: getMaintenanceRequestByIdMock,
      listMaintenanceRequestTimeline: listMaintenanceRequestTimelineMock
    })
  };
});

import { GET, PATCH } from "./route";

describe("/api/maintenance/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMaintenanceRequestTimelineMock.mockResolvedValue([]);
  });

  it("rejects tenant-role access on get", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    const response = await GET(new Request("http://localhost/api/maintenance/request-1"), {
      params: Promise.resolve({ id: "request-1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
    expect(getMaintenanceRequestByIdMock).not.toHaveBeenCalled();
  });

  it("returns maintenance detail for operators", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "manager",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    getMaintenanceRequestByIdMock.mockResolvedValue({
      id: "request-1",
      status: "open"
    });

    const response = await GET(new Request("http://localhost/api/maintenance/request-1"), {
      params: Promise.resolve({ id: "request-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        request: {
          id: "request-1",
          status: "open"
        },
        timeline: []
      }
    });
    expect(getMaintenanceRequestByIdMock).toHaveBeenCalledWith("request-1", "org-1");
    expect(listMaintenanceRequestTimelineMock).toHaveBeenCalledWith("request-1", "org-1");
  });

  it("rejects invalid patch payload", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "manager",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    updateMaintenanceRequestMock.mockResolvedValue({
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "status must be one of: open, in_progress, resolved, cancelled"
      }
    });

    const response = await PATCH(
      new Request("http://localhost/api/maintenance/request-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "paused" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "request-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "status must be one of: open, in_progress, resolved, cancelled"
    });
    expect(updateMaintenanceRequestMock).toHaveBeenCalledTimes(1);
  });
});
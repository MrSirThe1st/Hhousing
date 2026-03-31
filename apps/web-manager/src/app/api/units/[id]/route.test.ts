import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  createRepositoryFromEnvMock,
  parseJsonBodyMock,
  getUnitByIdMock,
  updateUnitMock,
  deleteUnitMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  createRepositoryFromEnvMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  getUnitByIdMock: vi.fn(),
  updateUnitMock: vi.fn(),
  deleteUnitMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createRepositoryFromEnv: createRepositoryFromEnvMock,
    parseJsonBody: parseJsonBodyMock
  };
});

import { GET, PATCH } from "./route";

describe("/api/units/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createRepositoryFromEnvMock.mockReturnValue({
      success: true,
      data: {
        getUnitById: getUnitByIdMock,
        updateUnit: updateUnitMock,
        deleteUnit: deleteUnitMock
      }
    });
  });

  it("rejects tenant-role access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    const response = await GET(new Request("http://localhost/api/units/unit-1"), {
      params: Promise.resolve({ id: "unit-1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
    expect(getUnitByIdMock).not.toHaveBeenCalled();
  });

  it("returns unit detail for operators", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "manager",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    getUnitByIdMock.mockResolvedValue({
      id: "unit-1",
      unitNumber: "A1"
    });

    const response = await GET(new Request("http://localhost/api/units/unit-1"), {
      params: Promise.resolve({ id: "unit-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        id: "unit-1",
        unitNumber: "A1"
      }
    });
    expect(getUnitByIdMock).toHaveBeenCalledWith("unit-1", "org-1");
  });

  it("rejects invalid patch payload", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "manager",
      organizationId: "org-1",
      membershipId: "membership-1"
    });

    parseJsonBodyMock.mockResolvedValue({
      propertyId: "property-1",
      unitNumber: "A1",
      monthlyRentAmount: 1200,
      currencyCode: "CDF",
      status: "paused"
    });

    const response = await PATCH(
      new Request("http://localhost/api/units/unit-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "unit-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "status must be one of: vacant, occupied, inactive"
    });
    expect(updateUnitMock).not.toHaveBeenCalled();
  });
});
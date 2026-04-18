import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  createRepositoryFromEnvMock,
  parseJsonBodyMock,
  getPropertyByIdMock,
  getOwnerClientByIdMock,
  updatePropertyMock,
  getScopedPortfolioDataMock,
  requireOperatorSessionMock,
  mapErrorCodeToHttpStatusMock,
  requirePermissionMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  createRepositoryFromEnvMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  getPropertyByIdMock: vi.fn(),
  getOwnerClientByIdMock: vi.fn(),
  updatePropertyMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  requireOperatorSessionMock: vi.fn(),
  mapErrorCodeToHttpStatusMock: vi.fn(),
  requirePermissionMock: vi.fn()
}));

vi.mock("../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../shared", () => ({
  createRepositoryFromEnv: createRepositoryFromEnvMock,
  createTeamFunctionsRepo: () => ({ listMemberFunctions: vi.fn() }),
  parseJsonBody: parseJsonBodyMock,
  jsonResponse: (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json"
      }
    })
}));

vi.mock("../../../../../api/shared", () => ({
  requireOperatorSession: requireOperatorSessionMock,
  mapErrorCodeToHttpStatus: mapErrorCodeToHttpStatusMock
}));

vi.mock("../../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

vi.mock("../../../../../api/organizations/permissions", () => ({
  requirePermission: requirePermissionMock
}));

import { PATCH } from "./route";

describe("/api/properties/[id]/client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermissionMock.mockResolvedValue({
      success: true,
      data: {
        organizationId: "org_1",
        role: "property_manager",
        memberships: [
          {
            id: "mem_1",
            organizationId: "org_1"
          }
        ]
      }
    });
    getScopedPortfolioDataMock.mockResolvedValue({
      currentScope: "managed",
      properties: [],
      propertyIds: new Set(["prp_1"]),
      unitIds: new Set(),
      leases: [],
      leaseIds: new Set(),
      tenantIds: new Set()
    });
  });

  it("blocks tenant access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({ role: "tenant" });
    requireOperatorSessionMock.mockReturnValue({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
    mapErrorCodeToHttpStatusMock.mockReturnValue(403);

    const response = await PATCH(
      new Request("http://localhost/api/properties/prp_1/client", { method: "PATCH" }),
      { params: Promise.resolve({ id: "prp_1" }) }
    );

    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("FORBIDDEN");
  });

  it("updates property client for operators", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({ role: "property_manager" });
    requireOperatorSessionMock.mockReturnValue({
      success: true,
      data: {
        organizationId: "org_1",
        role: "property_manager",
        memberships: [
          {
            id: "mem_1",
            organizationId: "org_1"
          }
        ]
      }
    });
    parseJsonBodyMock.mockResolvedValue({ clientId: "ocl_2" });
    createRepositoryFromEnvMock.mockReturnValue({
      success: true,
      data: {
        getPropertyById: getPropertyByIdMock,
        getOwnerClientById: getOwnerClientByIdMock,
        updateProperty: updatePropertyMock
      }
    });
    getPropertyByIdMock.mockResolvedValue({
      id: "prp_1",
      name: "Residence Test",
      address: "Avenue 1",
      city: "Kinshasa",
      countryCode: "CD",
      managementContext: "managed"
    });
    getOwnerClientByIdMock.mockResolvedValue({ id: "ocl_2", name: "SCI Horizon" });
    updatePropertyMock.mockResolvedValue({ id: "prp_1", clientId: "ocl_2", clientName: "SCI Horizon" });

    const response = await PATCH(
      new Request("http://localhost/api/properties/prp_1/client", { method: "PATCH" }),
      { params: Promise.resolve({ id: "prp_1" }) }
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.clientId).toBe("ocl_2");
    expect(updatePropertyMock).toHaveBeenCalledTimes(1);
  });

  it("updates owned properties", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({ role: "property_manager" });
    requireOperatorSessionMock.mockReturnValue({
      success: true,
      data: {
        organizationId: "org_1",
        role: "property_manager",
        memberships: [
          {
            id: "mem_1",
            organizationId: "org_1"
          }
        ]
      }
    });
    parseJsonBodyMock.mockResolvedValue({ clientId: "ocl_2" });
    createRepositoryFromEnvMock.mockReturnValue({
      success: true,
      data: {
        getPropertyById: getPropertyByIdMock,
        getOwnerClientById: getOwnerClientByIdMock,
        updateProperty: updatePropertyMock
      }
    });
    getPropertyByIdMock.mockResolvedValue({
      id: "prp_1",
      name: "Residence Test",
      address: "Avenue 1",
      city: "Kinshasa",
      countryCode: "CD",
      managementContext: "owned"
    });

    const response = await PATCH(
      new Request("http://localhost/api/properties/prp_1/client", { method: "PATCH" }),
      { params: Promise.resolve({ id: "prp_1" }) }
    );

    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);
    expect(updatePropertyMock).toHaveBeenCalledTimes(1);
  });
});
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
  mapErrorCodeToHttpStatusMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  createRepositoryFromEnvMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  getPropertyByIdMock: vi.fn(),
  getOwnerClientByIdMock: vi.fn(),
  updatePropertyMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  requireOperatorSessionMock: vi.fn(),
  mapErrorCodeToHttpStatusMock: vi.fn()
}));

vi.mock("../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../shared", () => ({
  createRepositoryFromEnv: createRepositoryFromEnvMock,
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

import { PATCH } from "./route";

describe("/api/properties/[id]/client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        organizationId: "org_1"
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

  it("rejects owned properties", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({ role: "property_manager" });
    requireOperatorSessionMock.mockReturnValue({
      success: true,
      data: {
        organizationId: "org_1"
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

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(updatePropertyMock).not.toHaveBeenCalled();
  });
});
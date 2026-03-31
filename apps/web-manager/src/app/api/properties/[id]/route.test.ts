import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  createRepositoryFromEnvMock,
  parseJsonBodyMock,
  getPropertyByIdMock,
  requireOperatorSessionMock,
  mapErrorCodeToHttpStatusMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  createRepositoryFromEnvMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  getPropertyByIdMock: vi.fn(),
  requireOperatorSessionMock: vi.fn(),
  mapErrorCodeToHttpStatusMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../shared", () => ({
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

vi.mock("../../../../api/shared", () => ({
  requireOperatorSession: requireOperatorSessionMock,
  mapErrorCodeToHttpStatus: mapErrorCodeToHttpStatusMock
}));

import { GET, PATCH } from "./route";

describe("/api/properties/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks tenant access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({ role: "tenant" });

    requireOperatorSessionMock.mockReturnValue({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });

    mapErrorCodeToHttpStatusMock.mockReturnValue(403);

    const response = await GET(
      new Request("http://localhost/api/properties/prp_1", { method: "GET" }),
      { params: Promise.resolve({ id: "prp_1" }) }
    );

    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
    expect(createRepositoryFromEnvMock).not.toHaveBeenCalled();
  });

  it("returns property detail for operators", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({ role: "property_manager" });

    requireOperatorSessionMock.mockReturnValue({
      success: true,
      data: {
        organizationId: "org_1"
      }
    });

    createRepositoryFromEnvMock.mockReturnValue({
      success: true,
      data: {
        getPropertyById: getPropertyByIdMock
      }
    });

    getPropertyByIdMock.mockResolvedValue({
      id: "prp_1",
      name: "Residence Test"
    });

    const response = await GET(
      new Request("http://localhost/api/properties/prp_1", { method: "GET" }),
      { params: Promise.resolve({ id: "prp_1" }) }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        id: "prp_1",
        name: "Residence Test"
      }
    });
    expect(getPropertyByIdMock).toHaveBeenCalledWith("prp_1", "org_1");
  });

  it("returns validation error for invalid patch payload", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({ role: "property_manager" });

    requireOperatorSessionMock.mockReturnValue({
      success: true,
      data: {
        organizationId: "org_1"
      }
    });

    parseJsonBodyMock.mockResolvedValue({
      name: "Residence Test",
      address: "Avenue",
      city: "Kinshasa",
      countryCode: "Congo"
    });

    mapErrorCodeToHttpStatusMock.mockReturnValue(400);

    const response = await PATCH(
      new Request("http://localhost/api/properties/prp_1", { method: "PATCH" }),
      { params: Promise.resolve({ id: "prp_1" }) }
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toContain("countryCode");
    expect(createRepositoryFromEnvMock).not.toHaveBeenCalled();
  });
});

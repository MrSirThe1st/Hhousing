import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createPropertyMock,
  extractAuthSessionFromCookiesMock,
  createRepositoryFromEnvMock,
  parseJsonBodyMock
} = vi.hoisted(() => ({
  createPropertyMock: vi.fn(),
  extractAuthSessionFromCookiesMock: vi.fn(),
  createRepositoryFromEnvMock: vi.fn(),
  parseJsonBodyMock: vi.fn()
}));

vi.mock("../../../api", () => ({
  createProperty: createPropertyMock
}));

vi.mock("../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../shared", () => ({
  createId: (prefix: string) => `${prefix}_123`,
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

import { POST } from "./route";

describe("POST /api/properties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates property successfully", async () => {
    parseJsonBodyMock.mockResolvedValue({
      organizationId: "org_1",
      name: "Residence 24",
      address: "Avenue Test",
      city: "Kinshasa",
      countryCode: "CD"
    });

    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    createRepositoryFromEnvMock.mockReturnValue({
      success: true,
      data: {}
    });

    createPropertyMock.mockResolvedValue({
      status: 201,
      body: {
        success: true,
        data: {
          property: {
            id: "prp_1"
          }
        }
      }
    });

    const response = await POST(new Request("http://localhost/api/properties", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(createPropertyMock).toHaveBeenCalledTimes(1);
  });

  it("returns unauthorized when no session", async () => {
    parseJsonBodyMock.mockResolvedValue({
      organizationId: "org_1",
      name: "Residence 24",
      address: "Avenue Test",
      city: "Kinshasa",
      countryCode: "CD"
    });

    extractAuthSessionFromCookiesMock.mockResolvedValue(null);

    createRepositoryFromEnvMock.mockReturnValue({
      success: true,
      data: {}
    });

    createPropertyMock.mockResolvedValue({
      status: 401,
      body: {
        success: false,
        code: "UNAUTHORIZED",
        error: "Authentication required"
      }
    });

    const response = await POST(new Request("http://localhost/api/properties", { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHORIZED");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  updateOwnerMock,
  extractAuthSessionFromCookiesMock,
  createRepositoryFromEnvMock,
  parseJsonBodyMock
} = vi.hoisted(() => ({
  updateOwnerMock: vi.fn(),
  extractAuthSessionFromCookiesMock: vi.fn(),
  createRepositoryFromEnvMock: vi.fn(),
  parseJsonBodyMock: vi.fn()
}));

vi.mock("../../../../api", () => ({
  updateOwner: updateOwnerMock
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

import { PATCH } from "./route";

describe("/api/owners/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createRepositoryFromEnvMock.mockReturnValue({
      success: true,
      data: {}
    });
  });

  it("updates owner successfully", async () => {
    parseJsonBodyMock.mockResolvedValue({
      fullName: "Nadine Horizon",
      isCompany: true,
      companyName: "SCI Horizon",
      address: "12 avenue des Palmiers",
      country: "RDC",
      city: "Kinshasa",
      state: "Kinshasa",
      phoneNumber: "+243000000000",
      profilePictureUrl: "https://cdn.test/owner.jpg"
    });

    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    updateOwnerMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          owner: {
            id: "own_1",
            organizationId: "org_1",
            name: "SCI Horizon",
            fullName: "Nadine Horizon",
            ownerType: "client",
            userId: null,
            address: "12 avenue des Palmiers",
            isCompany: true,
            companyName: "SCI Horizon",
            country: "RDC",
            city: "Kinshasa",
            state: "Kinshasa",
            phoneNumber: "+243000000000",
            profilePictureUrl: "https://cdn.test/owner.jpg",
            createdAtIso: "2026-04-05T10:00:00.000Z"
          }
        }
      }
    });

    const response = await PATCH(
      new Request("http://localhost/api/owners/own_1", { method: "PATCH" }),
      { params: Promise.resolve({ id: "own_1" }) }
    );

    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);
    expect(updateOwnerMock).toHaveBeenCalledTimes(1);
  });

  it("returns validation error for invalid json", async () => {
    parseJsonBodyMock.mockRejectedValue(new Error("invalid json"));

    const response = await PATCH(
      new Request("http://localhost/api/owners/own_1", {
        method: "PATCH",
        body: "{invalid",
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "own_1" }) }
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(updateOwnerMock).not.toHaveBeenCalled();
  });

  it("forwards auth failure from service", async () => {
    parseJsonBodyMock.mockResolvedValue({
      fullName: "Nadine Horizon",
      isCompany: false
    });

    extractAuthSessionFromCookiesMock.mockResolvedValue(null);

    updateOwnerMock.mockResolvedValue({
      status: 401,
      body: {
        success: false,
        code: "UNAUTHORIZED",
        error: "Authentication required"
      }
    });

    const response = await PATCH(
      new Request("http://localhost/api/owners/own_1", { method: "PATCH" }),
      { params: Promise.resolve({ id: "own_1" }) }
    );

    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("UNAUTHORIZED");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createOwnerMock,
  extractAuthSessionFromCookiesMock,
  listOwnersMock,
  createRepositoryFromEnvMock,
  parseJsonBodyMock
} = vi.hoisted(() => ({
  createOwnerMock: vi.fn(),
  extractAuthSessionFromCookiesMock: vi.fn(),
  listOwnersMock: vi.fn(),
  createRepositoryFromEnvMock: vi.fn(),
  parseJsonBodyMock: vi.fn()
}));

vi.mock("../../../api", () => ({
  createOwner: createOwnerMock,
  listOwners: listOwnersMock
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

import { GET, POST } from "./route";

describe("/api/owner-clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createRepositoryFromEnvMock.mockReturnValue({
      success: true,
      data: {}
    });
  });

  it("creates owner client successfully", async () => {
    parseJsonBodyMock.mockResolvedValue({
      organizationId: "org_1",
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

    createOwnerMock.mockResolvedValue({
      status: 201,
      body: {
        success: true,
        data: {
          owner: {
            id: "own_1",
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

    const response = await POST(new Request("http://localhost/api/owner-clients", { method: "POST" }));

    expect(response.status).toBe(201);
    expect((await response.json()).success).toBe(true);
    expect(createOwnerMock).toHaveBeenCalledTimes(1);
  });

  it("returns validation error for invalid json", async () => {
    parseJsonBodyMock.mockRejectedValue(new Error("invalid json"));

    const response = await POST(
      new Request("http://localhost/api/owner-clients", {
        method: "POST",
        body: "{invalid",
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(createOwnerMock).not.toHaveBeenCalled();
  });

  it("returns clients on get", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    listOwnersMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          owners: [
            {
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
          ]
        }
      }
    });

    const response = await GET(new Request("http://localhost/api/owner-clients?organizationId=org_1"));

    expect(response.status).toBe(200);
    expect((await response.json()).data.owners).toHaveLength(1);
    expect(listOwnersMock).toHaveBeenCalledTimes(1);
  });
});
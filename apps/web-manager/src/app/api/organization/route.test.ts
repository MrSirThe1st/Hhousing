import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  parseJsonBodyMock,
  getOrganizationByIdMock,
  updateOrganizationMock,
  listMembershipsByOrganizationMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  getOrganizationByIdMock: vi.fn(),
  updateOrganizationMock: vi.fn(),
  listMembershipsByOrganizationMock: vi.fn()
}));

vi.mock("../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../shared", async () => {
  const actual = await vi.importActual<typeof import("../shared")>("../shared");
  return {
    ...actual,
    parseJsonBody: parseJsonBodyMock,
    createAuthRepo: () => ({
      listMembershipsByOrganization: listMembershipsByOrganizationMock
    }),
    createRepositoryFromEnv: () => ({
      success: true,
      data: {
        getOrganizationById: getOrganizationByIdMock,
        updateOrganization: updateOrganizationMock
      }
    })
  };
});

import { GET, PATCH } from "./route";

describe("/api/organization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: [
        {
          id: "membership-owner",
          userId: "user-1",
          organizationId: "org-1",
          organizationName: "Gestion Horizon",
          role: "property_manager",
          status: "active",
          capabilities: { canOwnProperties: true },
          createdAtIso: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
    listMembershipsByOrganizationMock.mockResolvedValue([
      {
        id: "membership-owner",
        userId: "user-1",
        organizationId: "org-1",
        organizationName: "Gestion Horizon",
        role: "property_manager",
        status: "active",
        capabilities: { canOwnProperties: true },
        createdAtIso: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "membership-team",
        userId: "user-2",
        organizationId: "org-1",
        organizationName: "Gestion Horizon",
        role: "property_manager",
        status: "active",
        capabilities: { canOwnProperties: false },
        createdAtIso: "2026-02-01T00:00:00.000Z"
      }
    ]);
    getOrganizationByIdMock.mockResolvedValue({
      id: "org-1",
      name: "Gestion Horizon",
      logoUrl: null,
      contactEmail: null,
      contactPhone: null,
      contactWhatsapp: null,
      websiteUrl: null,
      address: null,
      emailSignature: null,
      status: "active",
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });
    updateOrganizationMock.mockResolvedValue({
      id: "org-1",
      name: "Gestion Horizon",
      logoUrl: "https://example.com/logo.png",
      contactEmail: "contact@horizon.test",
      contactPhone: null,
      contactWhatsapp: null,
      websiteUrl: null,
      address: null,
      emailSignature: null,
      status: "active",
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });
  });

  it("returns current organization details", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.organization.name).toBe("Gestion Horizon");
  });

  it("updates current organization details", async () => {
    parseJsonBodyMock.mockResolvedValue({
      name: "Gestion Horizon",
      logoUrl: "https://example.com/logo.png",
      contactEmail: "contact@horizon.test"
    });

    const response = await PATCH(new Request("http://localhost/api/organization", { method: "PATCH" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateOrganizationMock).toHaveBeenCalledWith({
      id: "org-1",
      name: "Gestion Horizon",
      logoUrl: "https://example.com/logo.png",
      contactEmail: "contact@horizon.test",
      contactPhone: null,
      contactWhatsapp: null,
      websiteUrl: null,
      address: null,
      emailSignature: null
    });
    expect(body.success).toBe(true);
  });

  it("allows operator read-only access on GET for landlords", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: [
        {
          id: "membership-owner",
          userId: "user-1",
          organizationId: "org-1",
          organizationName: "Gestion Horizon",
          role: "landlord",
          status: "active",
          capabilities: { canOwnProperties: true },
          createdAtIso: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("blocks PATCH when the operator is not the account owner", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-2",
      role: "property_manager",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: [
        {
          id: "membership-team",
          userId: "user-2",
          organizationId: "org-1",
          organizationName: "Gestion Horizon",
          role: "property_manager",
          status: "active",
          capabilities: { canOwnProperties: false },
          createdAtIso: "2026-02-01T00:00:00.000Z"
        }
      ]
    });

    parseJsonBodyMock.mockResolvedValue({
      name: "Gestion Horizon"
    });

    const response = await PATCH(new Request("http://localhost/api/organization", { method: "PATCH" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Only the account owner can edit organization details"
    });
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  parseJsonBodyMock,
  getOrganizationByIdMock,
  updateOrganizationMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  getOrganizationByIdMock: vi.fn(),
  updateOrganizationMock: vi.fn()
}));

vi.mock("../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../lib/operator-context", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/operator-context")>("../../../lib/operator-context");
  return {
    ...actual,
    canEditOrganizationDetails: (session: { role: string; capabilities?: { canOwnProperties?: boolean } }) => {
      if (session.role === "landlord") {
        return false;
      }

      return true;
    }
  };
});

vi.mock("../shared", async () => {
  const actual = await vi.importActual<typeof import("../shared")>("../shared");
  return {
    ...actual,
    parseJsonBody: parseJsonBodyMock,
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
      memberships: []
    });
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

  it("rejects owner-only operators", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
  });
});
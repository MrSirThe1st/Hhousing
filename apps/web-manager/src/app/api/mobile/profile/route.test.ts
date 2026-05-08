import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractTenantSessionFromRequestMock,
  getCurrentLeaseByTenantAuthUserIdMock,
  getTenantByIdMock,
  updateTenantMock
} = vi.hoisted(() => ({
  extractTenantSessionFromRequestMock: vi.fn(),
  getCurrentLeaseByTenantAuthUserIdMock: vi.fn(),
  getTenantByIdMock: vi.fn(),
  updateTenantMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractTenantSessionFromRequest: extractTenantSessionFromRequestMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");
  return {
    ...actual,
    createTenantLeaseRepo: (): {
      getCurrentLeaseByTenantAuthUserId: typeof getCurrentLeaseByTenantAuthUserIdMock;
      getTenantById: typeof getTenantByIdMock;
      updateTenant: typeof updateTenantMock;
    } => ({
      getCurrentLeaseByTenantAuthUserId: getCurrentLeaseByTenantAuthUserIdMock,
      getTenantById: getTenantByIdMock,
      updateTenant: updateTenantMock
    })
  };
});

import { GET, PATCH } from "./route";

const tenantSession = {
  success: true as const,
  data: {
    userId: "tenant-auth-1",
    role: "tenant",
    organizationId: "org-1",
    capabilities: { canOwnProperties: false },
    memberships: []
  }
};

const sampleLease = {
  id: "lease-1",
  organizationId: "org-1",
  tenantId: "tenant-1",
  tenantFullName: "Alice Martin",
  tenantEmail: "alice@example.com"
};

const sampleTenant = {
  id: "tenant-1",
  organizationId: "org-1",
  authUserId: "tenant-auth-1",
  fullName: "Alice Martin",
  email: "alice@example.com",
  phone: "+243812345678",
  dateOfBirth: null,
  photoUrl: null,
  employmentStatus: null,
  jobTitle: null,
  monthlyIncome: null,
  numberOfOccupants: null,
  createdAtIso: "2026-01-01T00:00:00.000Z"
};

describe("GET /api/mobile/profile", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false, code: "UNAUTHORIZED", error: "Authentication required"
    });
    const res = await GET(new Request("http://localhost/api/mobile/profile"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when tenant has no active lease", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue(tenantSession);
    getCurrentLeaseByTenantAuthUserIdMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/mobile/profile"));
    expect(res.status).toBe(404);
  });

  it("returns tenant profile for authenticated tenant", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue(tenantSession);
    getCurrentLeaseByTenantAuthUserIdMock.mockResolvedValue(sampleLease);
    getTenantByIdMock.mockResolvedValue(sampleTenant);

    const res = await GET(new Request("http://localhost/api/mobile/profile"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.tenant.id).toBe("tenant-1");
    expect(json.data.tenant.fullName).toBe("Alice Martin");
  });
});

describe("PATCH /api/mobile/profile", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("rejects unauthenticated requests", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false, code: "UNAUTHORIZED", error: "Authentication required"
    });
    const res = await PATCH(new Request("http://localhost/api/mobile/profile", {
      method: "PATCH",
      body: JSON.stringify({ fullName: "Alice", phone: null })
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when fullName is missing", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue(tenantSession);
    const res = await PATCH(new Request("http://localhost/api/mobile/profile", {
      method: "PATCH",
      body: JSON.stringify({ fullName: "  ", phone: null })
    }));
    expect(res.status).toBe(400);
  });

  it("updates fullName and phone", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue(tenantSession);
    getCurrentLeaseByTenantAuthUserIdMock.mockResolvedValue(sampleLease);
    getTenantByIdMock.mockResolvedValue(sampleTenant);
    const updatedTenant = { ...sampleTenant, fullName: "Alice Dupont", phone: "+243899999999" };
    updateTenantMock.mockResolvedValue(updatedTenant);

    const res = await PATCH(new Request("http://localhost/api/mobile/profile", {
      method: "PATCH",
      body: JSON.stringify({ fullName: "Alice Dupont", phone: "+243899999999" })
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.tenant.fullName).toBe("Alice Dupont");
    expect(json.data.tenant.phone).toBe("+243899999999");
    expect(updateTenantMock).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Alice Dupont", phone: "+243899999999" })
    );
  });
});

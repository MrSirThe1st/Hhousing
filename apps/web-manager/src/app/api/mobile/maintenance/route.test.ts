import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractTenantSessionFromRequestMock,
  listMaintenanceRequestsByTenantAuthUserIdMock,
  createMaintenanceRequestMock,
  getCurrentLeaseByTenantAuthUserIdMock
} = vi.hoisted(() => ({
  extractTenantSessionFromRequestMock: vi.fn(),
  listMaintenanceRequestsByTenantAuthUserIdMock: vi.fn(),
  createMaintenanceRequestMock: vi.fn(),
  getCurrentLeaseByTenantAuthUserIdMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractTenantSessionFromRequest: extractTenantSessionFromRequestMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");
  return {
    ...actual,
    createMaintenanceRepo: (): {
      listMaintenanceRequestsByTenantAuthUserId: typeof listMaintenanceRequestsByTenantAuthUserIdMock;
      createMaintenanceRequest: typeof createMaintenanceRequestMock;
    } => ({
      listMaintenanceRequestsByTenantAuthUserId: listMaintenanceRequestsByTenantAuthUserIdMock,
      createMaintenanceRequest: createMaintenanceRequestMock
    }),
    createTenantLeaseRepo: (): {
      getCurrentLeaseByTenantAuthUserId: typeof getCurrentLeaseByTenantAuthUserIdMock;
    } => ({
      getCurrentLeaseByTenantAuthUserId: getCurrentLeaseByTenantAuthUserIdMock
    })
  };
});

import { GET, POST } from "./route";

const tenantSession = {
  userId: "tenant-auth-1",
  role: "tenant",
  organizationId: "org-1",
  capabilities: { canOwnProperties: false },
  memberships: []
};

const landlordSession = {
  userId: "user-1",
  role: "landlord",
  organizationId: "org-1",
  capabilities: { canOwnProperties: true },
  memberships: []
};

const sampleRequest = {
  id: "mnt-1",
  organizationId: "org-1",
  unitId: "unit-1",
  tenantId: "tenant-1",
  title: "Fuite d'eau",
  description: "Robinet qui goutte",
  priority: "medium",
  status: "open",
  assignedToName: null,
  internalNotes: null,
  resolutionNotes: null,
  resolvedAt: null,
  updatedAtIso: "2026-04-02T00:00:00.000Z",
  createdAtIso: "2026-04-02T00:00:00.000Z"
};

const sampleLease = {
  id: "lease-1",
  organizationId: "org-1",
  unitId: "unit-1",
  tenantId: "tenant-1",
  startDate: "2025-01-01",
  endDate: null,
  monthlyRentAmount: 1000,
  currencyCode: "EUR",
  status: "active",
  createdAtIso: "2025-01-01T00:00:00.000Z"
};

describe("GET /api/mobile/maintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });

    const response = await GET(new Request("http://localhost/api/mobile/maintenance"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
    expect(listMaintenanceRequestsByTenantAuthUserIdMock).not.toHaveBeenCalled();
  });

  it("rejects non-tenant roles", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false,
      code: "FORBIDDEN",
      error: "This endpoint is only available to tenants"
    });

    const response = await GET(new Request("http://localhost/api/mobile/maintenance"));

    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("FORBIDDEN");
    expect(listMaintenanceRequestsByTenantAuthUserIdMock).not.toHaveBeenCalled();
  });

  it("returns maintenance requests for authenticated tenant", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({ success: true, data: tenantSession });
    listMaintenanceRequestsByTenantAuthUserIdMock.mockResolvedValue([sampleRequest]);

    const response = await GET(new Request("http://localhost/api/mobile/maintenance"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.requests).toHaveLength(1);
    expect(json.data.requests[0].id).toBe("mnt-1");
    expect(listMaintenanceRequestsByTenantAuthUserIdMock).toHaveBeenCalledWith("tenant-auth-1", "org-1");
  });
});

describe("POST /api/mobile/maintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });

    const response = await POST(
      new Request("http://localhost/api/mobile/maintenance", {
        method: "POST",
        body: JSON.stringify({ title: "Test", description: "Test desc" }),
        headers: { "Content-Type": "application/json" }
      })
    );

    expect(response.status).toBe(401);
    expect(createMaintenanceRequestMock).not.toHaveBeenCalled();
  });

  it("returns 400 when title is missing", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({ success: true, data: tenantSession });

    const response = await POST(
      new Request("http://localhost/api/mobile/maintenance", {
        method: "POST",
        body: JSON.stringify({ description: "Test desc" }),
        headers: { "Content-Type": "application/json" }
      })
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(createMaintenanceRequestMock).not.toHaveBeenCalled();
  });

  it("returns 422 when tenant has no active lease", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({ success: true, data: tenantSession });
    getCurrentLeaseByTenantAuthUserIdMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/mobile/maintenance", {
        method: "POST",
        body: JSON.stringify({ title: "Fuite", description: "Robinet" }),
        headers: { "Content-Type": "application/json" }
      })
    );

    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe("NOT_FOUND");
    expect(createMaintenanceRequestMock).not.toHaveBeenCalled();
  });

  it("creates maintenance request and returns 201", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({ success: true, data: tenantSession });
    getCurrentLeaseByTenantAuthUserIdMock.mockResolvedValue(sampleLease);
    createMaintenanceRequestMock.mockResolvedValue(sampleRequest);

    const response = await POST(
      new Request("http://localhost/api/mobile/maintenance", {
        method: "POST",
        body: JSON.stringify({ title: "Fuite d'eau", description: "Robinet qui goutte", priority: "high" }),
        headers: { "Content-Type": "application/json" }
      })
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.request.id).toBe("mnt-1");
    expect(createMaintenanceRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        unitId: "unit-1",
        tenantId: "tenant-1",
        title: "Fuite d'eau",
        description: "Robinet qui goutte",
        priority: "high"
      })
    );
  });
});

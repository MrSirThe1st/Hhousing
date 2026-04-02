import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromRequestMock,
  getMaintenanceRequestByIdMock,
  listMaintenanceRequestsByTenantAuthUserIdMock,
  listMaintenanceRequestTimelineMock
} = vi.hoisted(() => ({
  extractAuthSessionFromRequestMock: vi.fn(),
  getMaintenanceRequestByIdMock: vi.fn(),
  listMaintenanceRequestsByTenantAuthUserIdMock: vi.fn(),
  listMaintenanceRequestTimelineMock: vi.fn()
}));

vi.mock("../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromRequest: extractAuthSessionFromRequestMock
}));

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createMaintenanceRepo: () => ({
      getMaintenanceRequestById: getMaintenanceRequestByIdMock,
      listMaintenanceRequestsByTenantAuthUserId: listMaintenanceRequestsByTenantAuthUserIdMock,
      listMaintenanceRequestTimeline: listMaintenanceRequestTimelineMock
    })
  };
});

import { GET } from "./route";

const tenantSession = {
  userId: "tenant-auth-1",
  role: "tenant",
  organizationId: "org-1",
  capabilities: { canOwnProperties: false },
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
  updatedAtIso: "2026-04-02T10:00:00.000Z",
  createdAtIso: "2026-04-02T00:00:00.000Z"
};

const sampleTimeline = [
  {
    id: "evt-1",
    organizationId: "org-1",
    maintenanceRequestId: "mnt-1",
    eventType: "created",
    statusFrom: null,
    statusTo: "open",
    assignedToName: null,
    note: null,
    createdAtIso: "2026-04-02T00:00:00.000Z"
  },
  {
    id: "evt-2",
    organizationId: "org-1",
    maintenanceRequestId: "mnt-1",
    eventType: "assigned",
    statusFrom: null,
    statusTo: null,
    assignedToName: "Jean Dupont",
    note: null,
    createdAtIso: "2026-04-02T08:30:00.000Z"
  }
];

describe("GET /api/mobile/maintenance/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/mobile/maintenance/mnt-1"), {
      params: Promise.resolve({ id: "mnt-1" })
    });

    expect(response.status).toBe(401);
    expect(getMaintenanceRequestByIdMock).not.toHaveBeenCalled();
  });

  it("returns 404 when request not found", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue(tenantSession);
    getMaintenanceRequestByIdMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/mobile/maintenance/mnt-999"), {
      params: Promise.resolve({ id: "mnt-999" })
    });

    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("NOT_FOUND");
  });

  it("returns 403 when tenant does not own the request", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue(tenantSession);
    getMaintenanceRequestByIdMock.mockResolvedValue(sampleRequest);
    listMaintenanceRequestsByTenantAuthUserIdMock.mockResolvedValue([]); // Empty list = not owned

    const response = await GET(new Request("http://localhost/api/mobile/maintenance/mnt-1"), {
      params: Promise.resolve({ id: "mnt-1" })
    });

    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("FORBIDDEN");
  });

  it("returns maintenance request with timeline for owner", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue(tenantSession);
    getMaintenanceRequestByIdMock.mockResolvedValue(sampleRequest);
    listMaintenanceRequestsByTenantAuthUserIdMock.mockResolvedValue([sampleRequest]);
    listMaintenanceRequestTimelineMock.mockResolvedValue(sampleTimeline);

    const response = await GET(new Request("http://localhost/api/mobile/maintenance/mnt-1"), {
      params: Promise.resolve({ id: "mnt-1" })
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.request.id).toBe("mnt-1");
    expect(json.data.timeline).toHaveLength(2);
    expect(json.data.timeline[0].eventType).toBe("created");
    expect(json.data.timeline[1].eventType).toBe("assigned");
  });
});

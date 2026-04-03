import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromRequestMock,
  getCurrentLeaseByTenantAuthUserIdMock,
  listDocumentsMock
} = vi.hoisted(() => ({
  extractAuthSessionFromRequestMock: vi.fn(),
  getCurrentLeaseByTenantAuthUserIdMock: vi.fn(),
  listDocumentsMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromRequest: extractAuthSessionFromRequestMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");
  return {
    ...actual,
    createTenantLeaseRepo: (): {
      getCurrentLeaseByTenantAuthUserId: typeof getCurrentLeaseByTenantAuthUserIdMock;
    } => ({
      getCurrentLeaseByTenantAuthUserId: getCurrentLeaseByTenantAuthUserIdMock
    }),
    createDocumentRepo: (): {
      listDocuments: typeof listDocumentsMock;
    } => ({
      listDocuments: listDocumentsMock
    })
  };
});

import { GET } from "./route";

describe("/api/mobile/documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/mobile/documents"));

    expect(response.status).toBe(401);
    expect(listDocumentsMock).not.toHaveBeenCalled();
  });

  it("rejects non-tenant roles", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    const response = await GET(new Request("http://localhost/api/mobile/documents"));

    expect(response.status).toBe(403);
    expect(listDocumentsMock).not.toHaveBeenCalled();
  });

  it("returns an empty list when tenant has no active lease", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue({
      userId: "tenant-auth-1",
      role: "tenant",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });
    getCurrentLeaseByTenantAuthUserIdMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/mobile/documents"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { documents: [] }
    });
    expect(listDocumentsMock).not.toHaveBeenCalled();
  });

  it("returns lease and tenant documents for authenticated tenant", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue({
      userId: "tenant-auth-1",
      role: "tenant",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });
    getCurrentLeaseByTenantAuthUserIdMock.mockResolvedValue({
      id: "lease-1",
      organizationId: "org-1",
      unitId: "unit-1",
      tenantId: "tenant-1",
      startDate: "2026-01-01",
      endDate: null,
      monthlyRentAmount: 750,
      currencyCode: "USD",
      status: "active",
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });
    listDocumentsMock
      .mockResolvedValueOnce([
        {
          id: "doc-lease",
          organizationId: "org-1",
          fileName: "Bail.pdf",
          fileUrl: "https://example.com/lease.pdf",
          fileSize: 120000,
          mimeType: "application/pdf",
          documentType: "lease_agreement",
          attachmentType: "lease",
          attachmentId: "lease-1",
          uploadedBy: "manager-1",
          createdAtIso: "2026-04-03T10:00:00.000Z"
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "doc-receipt",
          organizationId: "org-1",
          fileName: "Recu-mars.pdf",
          fileUrl: "https://example.com/receipt.pdf",
          fileSize: 40000,
          mimeType: "application/pdf",
          documentType: "receipt",
          attachmentType: "tenant",
          attachmentId: "tenant-1",
          uploadedBy: "manager-1",
          createdAtIso: "2026-04-03T12:00:00.000Z"
        }
      ]);

    const response = await GET(new Request("http://localhost/api/mobile/documents"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.documents).toHaveLength(2);
    expect(json.data.documents[0].id).toBe("doc-receipt");
    expect(json.data.documents[1].id).toBe("doc-lease");
    expect(listDocumentsMock).toHaveBeenNthCalledWith(1, {
      organizationId: "org-1",
      attachmentType: "lease",
      attachmentId: "lease-1"
    });
    expect(listDocumentsMock).toHaveBeenNthCalledWith(2, {
      organizationId: "org-1",
      attachmentType: "tenant",
      attachmentId: "tenant-1"
    });
  });
});
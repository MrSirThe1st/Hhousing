import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getOrganizationByIdMock,
  getScopedPortfolioDataMock,
  getDocumentByIdMock,
  listMemberFunctionsMock,
  sendManagedEmailFromEnvMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getOrganizationByIdMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getDocumentByIdMock: vi.fn(),
  listMemberFunctionsMock: vi.fn(),
  sendManagedEmailFromEnvMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock,
  isDocumentAttachmentInScope: vi.fn().mockReturnValue(true)
}));

vi.mock("../../../../lib/email/resend", () => ({
  sendManagedEmailFromEnv: sendManagedEmailFromEnvMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");
  return {
    ...actual,
    createDocumentRepo: (): {
      getDocumentById: typeof getDocumentByIdMock;
    } => ({
      getDocumentById: getDocumentByIdMock
    }),
    createRepositoryFromEnv: (): {
      success: true;
      data: { getOrganizationById: typeof getOrganizationByIdMock };
    } => ({
      success: true,
      data: {
        getOrganizationById: getOrganizationByIdMock
      }
    }),
    createTeamFunctionsRepo: (): {
      listMemberFunctions: typeof listMemberFunctionsMock;
    } => ({
      listMemberFunctions: listMemberFunctionsMock
    })
  };
});

import { POST } from "./route";

describe("/api/emails/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      memberships: [
        {
          id: "membership-1",
          userId: "user-1",
          organizationId: "org-1",
          organizationName: "Org A",
          role: "property_manager",
          status: "active",
          capabilities: { canOwnProperties: false },
          createdAtIso: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
    listMemberFunctionsMock.mockResolvedValue([
      {
        id: "fn-msg",
        organizationId: "org-1",
        functionCode: "LEASING_AGENT",
        displayName: "Leasing Agent",
        description: null,
        permissions: ["message_tenants"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);
    getScopedPortfolioDataMock.mockResolvedValue({
      currentScope: "managed",
      properties: [],
      propertyIds: new Set(),
      unitIds: new Set(["unit-1"]),
      leases: [],
      leaseIds: new Set(["lease-1"]),
      tenantIds: new Set(["tenant-1"])
    });
    getDocumentByIdMock.mockResolvedValue({
      id: "doc-1",
      organizationId: "org-1",
      fileName: "Bail.pdf",
      fileUrl: "https://example.com/bail.pdf",
      fileSize: 1234,
      mimeType: "application/pdf",
      documentType: "lease_agreement",
      attachmentType: "lease",
      attachmentId: "lease-1",
      uploadedBy: "user-1",
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });
    getOrganizationByIdMock.mockResolvedValue({
      id: "org-1",
      name: "Gestion Horizon",
      logoUrl: "https://example.com/logo.png",
      contactEmail: "contact@horizon.test",
      contactPhone: "+243000000000",
      contactWhatsapp: null,
      websiteUrl: "https://horizon.test",
      address: null,
      emailSignature: "Gestion Horizon",
      status: "active",
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });
    sendManagedEmailFromEnvMock.mockResolvedValue(undefined);
  });

  it("sends an email with selected documents", async () => {
    const response = await POST(new Request("http://localhost/api/emails/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: "org-1",
        to: "tenant@example.com",
        subject: "Sujet",
        body: "Bonjour",
        documentIds: ["doc-1"]
      })
    }));

    expect(response.status).toBe(200);
    expect(sendManagedEmailFromEnvMock).toHaveBeenCalledWith({
      to: "tenant@example.com",
      subject: "Sujet",
      body: "Bonjour",
      organization: {
        id: "org-1",
        name: "Gestion Horizon",
        logoUrl: "https://example.com/logo.png",
        contactEmail: "contact@horizon.test",
        contactPhone: "+243000000000",
        contactWhatsapp: null,
        websiteUrl: "https://horizon.test",
        address: null,
        emailSignature: "Gestion Horizon",
        status: "active",
        createdAtIso: "2026-01-01T00:00:00.000Z"
      },
      attachments: [
        {
          fileName: "Bail.pdf",
          mimeType: "application/pdf",
          fileUrl: "https://example.com/bail.pdf"
        }
      ]
    });
  });

  it("rejects invalid email payload", async () => {
    const response = await POST(new Request("http://localhost/api/emails/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId: "org-1", to: "bad", subject: "", body: "" })
    }));

    expect(response.status).toBe(400);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  getLeaseByIdMock,
  getTenantByIdMock,
  getDocumentByIdMock,
  listPaymentsMock,
  createTenantInvitationMock,
  sendManagedEmailFromEnvMock,
  createTenantInvitationEmailSenderFromEnvMock,
  updateLeaseMock,
  listMemberFunctionsMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getLeaseByIdMock: vi.fn(),
  getTenantByIdMock: vi.fn(),
  getDocumentByIdMock: vi.fn(),
  listPaymentsMock: vi.fn(),
  createTenantInvitationMock: vi.fn(),
  sendManagedEmailFromEnvMock: vi.fn(),
  createTenantInvitationEmailSenderFromEnvMock: vi.fn(),
  updateLeaseMock: vi.fn(),
  listMemberFunctionsMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../api")>("../../../../api");
  return {
    ...actual,
    createTenantInvitation: createTenantInvitationMock
  };
});

vi.mock("../../../../lib/email/resend", () => ({
  createTenantInvitationEmailSenderFromEnv: createTenantInvitationEmailSenderFromEnvMock,
  sendManagedEmailFromEnv: sendManagedEmailFromEnvMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");

  return {
    ...actual,
    createTenantLeaseRepo: (): {
      getLeaseById: typeof getLeaseByIdMock;
      getTenantById: typeof getTenantByIdMock;
      updateLease: typeof updateLeaseMock;
    } => ({
      getLeaseById: getLeaseByIdMock,
      getTenantById: getTenantByIdMock,
      updateLease: updateLeaseMock
    }),
    createPaymentRepo: (): {
      listPayments: typeof listPaymentsMock;
    } => ({
      listPayments: listPaymentsMock
    }),
    createDocumentRepo: (): {
      getDocumentById: typeof getDocumentByIdMock;
    } => ({
      getDocumentById: getDocumentByIdMock
    }),
    createTeamFunctionsRepo: (): {
      listMemberFunctions: typeof listMemberFunctionsMock;
    } => ({
      listMemberFunctions: listMemberFunctionsMock
    })
  };
});

vi.mock("../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

import { GET, PATCH } from "./route";

describe("/api/leases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createTenantInvitationEmailSenderFromEnvMock.mockReturnValue(vi.fn().mockResolvedValue(undefined));
    sendManagedEmailFromEnvMock.mockResolvedValue(undefined);
    getDocumentByIdMock.mockResolvedValue(null);
    getScopedPortfolioDataMock.mockResolvedValue({
      currentScope: "managed",
      properties: [
        {
          property: {
            id: "property-1",
            organizationId: "org-1",
            name: "Immeuble A",
            address: "1 Avenue Test",
            city: "Kinshasa",
            countryCode: "CD",
            managementContext: "managed",
            propertyType: "multi_unit",
            yearBuilt: null,
            photoUrls: [],
            clientId: null,
            clientName: null,
            status: "active",
            createdAtIso: "2026-01-01T00:00:00.000Z"
          },
          units: [
            {
              id: "unit-1",
              propertyId: "property-1",
              unitNumber: "A1",
              monthlyRentAmount: 500,
              depositAmount: 100,
              currencyCode: "CDF",
              status: "vacant",
              bedroomCount: null,
              bathroomCount: null,
              sizeSqm: null,
              amenities: [],
              features: [],
              createdAtIso: "2026-01-01T00:00:00.000Z"
            }
          ]
        }
      ],
      propertyIds: new Set(["property-1"]),
      unitIds: new Set(["unit-1"]),
      leases: [],
      leaseIds: new Set(["lease-1"]),
      tenantIds: new Set()
    });
    listMemberFunctionsMock.mockResolvedValue([
      {
        id: "fn-lease",
        organizationId: "org-1",
        functionCode: "LEASING_AGENT",
        displayName: "Leasing Agent",
        description: null,
        permissions: ["view_lease", "edit_lease"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);
    createTenantInvitationMock.mockResolvedValue({
      status: 201,
      body: {
        success: true,
        data: {
          invitationId: "tin-1",
          tenantId: "tenant-1",
          email: "tenant@example.com",
          expiresAtIso: "2026-04-10T00:00:00.000Z",
          activationLink: "hhousing-tenant://accept-invite?token=abc"
        }
      }
    });
  });

  it("rejects tenant-role access", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "tenant",
      organizationId: "org-1",
      memberships: []
    });

    const response = await GET(new Request("http://localhost/api/leases/lease-1"), {
      params: Promise.resolve({ id: "lease-1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    });
    expect(getLeaseByIdMock).not.toHaveBeenCalled();
  });

  it("returns lease detail for operators", async () => {
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

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      unitId: "unit-1",
      status: "active"
    });

    const response = await GET(new Request("http://localhost/api/leases/lease-1"), {
      params: Promise.resolve({ id: "lease-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        id: "lease-1",
        unitId: "unit-1",
        status: "active"
      }
    });
    expect(getLeaseByIdMock).toHaveBeenCalledWith("lease-1", "org-1");
  });

  it("rejects invalid patch payload", async () => {
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

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1", {
        method: "PATCH",
        body: JSON.stringify({ endDate: "2026/01/01", status: "paused" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "endDate must be YYYY-MM-DD or null"
    });
    expect(updateLeaseMock).not.toHaveBeenCalled();
  });

  it("rejects property_manager without view_lease permission", async () => {
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
        id: "fn-accountant",
        organizationId: "org-1",
        functionCode: "ACCOUNTANT",
        displayName: "Accountant",
        description: null,
        permissions: ["view_payments"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);

    const response = await GET(new Request("http://localhost/api/leases/lease-1"), {
      params: Promise.resolve({ id: "lease-1" })
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Missing permission: view_lease"
    });
    expect(getLeaseByIdMock).not.toHaveBeenCalled();
  });

  it("finalizes a pending lease once all initial charges are paid", async () => {
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

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      tenantId: "tenant-1",
      tenantEmail: "tenant@example.com",
      unitId: "unit-1",
      endDate: null,
      status: "pending"
    });
    getTenantByIdMock.mockResolvedValue({
      id: "tenant-1",
      organizationId: "org-1",
      authUserId: null,
      fullName: "Tenant One",
      email: "tenant@example.com",
      phone: null,
      dateOfBirth: null,
      photoUrl: null,
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });
    listPaymentsMock.mockResolvedValue([
      {
        id: "pay-1",
        status: "paid",
        isInitialCharge: true
      },
      {
        id: "pay-2",
        status: "paid",
        isInitialCharge: true
      }
    ]);
    updateLeaseMock.mockResolvedValue({
      id: "lease-1",
      status: "active",
      signedAt: "2026-04-03",
      signingMethod: "physical"
    });

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1", {
        method: "PATCH",
        body: JSON.stringify({
          action: "finalize",
          organizationId: "org-1",
          signedAt: "2026-04-03",
          signingMethod: "physical"
        }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(200);
    expect(updateLeaseMock).toHaveBeenCalledWith({
      id: "lease-1",
      organizationId: "org-1",
      endDate: null,
      status: "active",
      signedAt: "2026-04-03",
      signingMethod: "physical"
    });
    expect(createTenantInvitationMock).toHaveBeenCalledTimes(1);
  });

  it("sends a draft email from a pending lease", async () => {
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

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      tenantId: "tenant-1",
      tenantFullName: "Tenant One",
      tenantEmail: "tenant@example.com",
      unitId: "unit-1",
      startDate: "2026-04-01",
      endDate: null,
      monthlyRentAmount: 500,
      currencyCode: "CDF",
      status: "pending"
    });
    getDocumentByIdMock.mockResolvedValue({
      id: "doc-1",
      organizationId: "org-1",
      fileName: "Bail.pdf",
      fileUrl: "https://example.com/bail.pdf",
      fileSize: 1234,
      mimeType: "application/pdf",
      documentType: "lease_agreement",
      attachmentType: null,
      attachmentId: null,
      uploadedBy: "user-1",
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "send_draft_email", documentIds: ["doc-1"] }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(200);
    expect(sendManagedEmailFromEnvMock).toHaveBeenCalledWith(expect.objectContaining({
      to: "tenant@example.com",
      attachments: [
        {
          fileName: "Bail.pdf",
          mimeType: "application/pdf",
          fileUrl: "https://example.com/bail.pdf"
        }
      ]
    }));
  });

  it("resends a tenant activation email for a lease without login access", async () => {
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

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      tenantId: "tenant-1",
      tenantEmail: "tenant@example.com",
      tenantFullName: "Tenant One",
      unitId: "unit-1",
      endDate: null,
      status: "active"
    });
    getTenantByIdMock.mockResolvedValue({
      id: "tenant-1",
      organizationId: "org-1",
      authUserId: null,
      fullName: "Tenant One",
      email: "tenant@example.com",
      phone: null,
      dateOfBirth: null,
      photoUrl: null,
      createdAtIso: "2026-01-01T00:00:00.000Z"
    });

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "resend_activation_email" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(200);
    expect(createTenantInvitationMock).toHaveBeenCalledTimes(1);
  });

  it("rejects resend activation when tenant email is missing", async () => {
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

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      tenantId: "tenant-1",
      tenantEmail: null,
      tenantFullName: "Tenant One",
      unitId: "unit-1",
      endDate: null,
      status: "active"
    });

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "resend_activation_email" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Tenant email is required before resending activation"
    });
    expect(createTenantInvitationMock).not.toHaveBeenCalled();
  });

  it("rejects draft email send when tenant email is missing", async () => {
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

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      tenantId: "tenant-1",
      tenantFullName: "Tenant One",
      tenantEmail: null,
      unitId: "unit-1",
      endDate: null,
      status: "pending"
    });

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "send_draft_email", documentIds: ["doc-1"] }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Tenant email is required before sending the draft"
    });
    expect(sendManagedEmailFromEnvMock).not.toHaveBeenCalled();
  });

  it("rejects draft email send when no documents are selected", async () => {
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

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      tenantId: "tenant-1",
      tenantFullName: "Tenant One",
      tenantEmail: "tenant@example.com",
      unitId: "unit-1",
      startDate: "2026-04-01",
      endDate: null,
      monthlyRentAmount: 500,
      currencyCode: "CDF",
      status: "pending"
    });
    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "send_draft_email" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Sélectionnez au moins un document avant d'envoyer le brouillon"
    });
    expect(sendManagedEmailFromEnvMock).not.toHaveBeenCalled();
  });

  it("rejects draft email send when a selected document does not exist", async () => {
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

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      tenantId: "tenant-1",
      tenantFullName: "Tenant One",
      tenantEmail: "tenant@example.com",
      unitId: "unit-1",
      startDate: "2026-04-01",
      endDate: null,
      monthlyRentAmount: 500,
      currencyCode: "CDF",
      status: "pending"
    });
    getDocumentByIdMock.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "send_draft_email", documentIds: ["doc-missing"] }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      success: false,
      code: "NOT_FOUND",
      error: "Document not found"
    });
    expect(sendManagedEmailFromEnvMock).not.toHaveBeenCalled();
  });

  it("blocks finalization while an initial charge remains unpaid", async () => {
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

    getLeaseByIdMock.mockResolvedValue({
      id: "lease-1",
      tenantId: "tenant-1",
      tenantEmail: "tenant@example.com",
      unitId: "unit-1",
      endDate: null,
      status: "pending"
    });
    listPaymentsMock.mockResolvedValue([
      {
        id: "pay-1",
        status: "pending",
        isInitialCharge: true
      }
    ]);

    const response = await PATCH(
      new Request("http://localhost/api/leases/lease-1", {
        method: "PATCH",
        body: JSON.stringify({
          action: "finalize",
          organizationId: "org-1",
          signedAt: "2026-04-03",
          signingMethod: "physical"
        }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "lease-1" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "All initial move-in charges must be marked as paid before finalization"
    });
    expect(updateLeaseMock).not.toHaveBeenCalled();
    expect(createTenantInvitationMock).not.toHaveBeenCalled();
  });
});
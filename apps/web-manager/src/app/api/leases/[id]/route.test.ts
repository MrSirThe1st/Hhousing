import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  getLeaseByIdMock,
  getTenantByIdMock,
  listPaymentsMock,
  createTenantInvitationMock,
  createTenantInvitationEmailSenderFromEnvMock,
  updateLeaseMock,
  listMemberFunctionsMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getLeaseByIdMock: vi.fn(),
  getTenantByIdMock: vi.fn(),
  listPaymentsMock: vi.fn(),
  createTenantInvitationMock: vi.fn(),
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
  createTenantInvitationEmailSenderFromEnv: createTenantInvitationEmailSenderFromEnvMock
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
    getScopedPortfolioDataMock.mockResolvedValue({
      currentScope: "managed",
      properties: [],
      propertyIds: new Set(),
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
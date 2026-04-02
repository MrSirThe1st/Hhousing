import { beforeEach, describe, expect, it, vi } from "vitest";

const { validateTenantInvitationMock } = vi.hoisted(() => ({
  validateTenantInvitationMock: vi.fn()
}));

vi.mock("../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../api")>("../../../../../api");
  return {
    ...actual,
    validateTenantInvitation: validateTenantInvitationMock
  };
});

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createTenantLeaseRepo: () => ({})
  };
});

import { GET } from "./route";

describe("/api/mobile/invitations/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error for missing token", async () => {
    validateTenantInvitationMock.mockResolvedValue({
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "token is required" }
    });

    const response = await GET(new Request("http://localhost/api/mobile/invitations/validate"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "token is required"
    });
  });

  it("returns invitation preview", async () => {
    validateTenantInvitationMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          invitation: {
            invitationId: "tin-1",
            tenantId: "tenant-1",
            organizationId: "org-1",
            organizationName: "Org 1",
            tenantFullName: "Jean Tenant",
            tenantEmail: "tenant@example.com",
            tenantPhone: null,
            leaseId: "lease-1",
            unitId: "unit-1",
            leaseStartDate: "2026-04-01",
            leaseEndDate: null,
            monthlyRentAmount: 500,
            currencyCode: "USD",
            expiresAtIso: "2026-04-09T00:00:00.000Z"
          }
        }
      }
    });

    const response = await GET(
      new Request("http://localhost/api/mobile/invitations/validate?token=abc")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        invitation: {
          invitationId: "tin-1",
          tenantId: "tenant-1",
          organizationId: "org-1",
          organizationName: "Org 1",
          tenantFullName: "Jean Tenant",
          tenantEmail: "tenant@example.com",
          tenantPhone: null,
          leaseId: "lease-1",
          unitId: "unit-1",
          leaseStartDate: "2026-04-01",
          leaseEndDate: null,
          monthlyRentAmount: 500,
          currencyCode: "USD",
          expiresAtIso: "2026-04-09T00:00:00.000Z"
        }
      }
    });
  });
});
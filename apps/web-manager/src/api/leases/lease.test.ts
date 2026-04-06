import { describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@hhousing/api-contracts";
import type { PaymentRepository, TenantLeaseRepository } from "@hhousing/data-access";
import type { TeamPermissionRepository } from "../organizations/permissions";
import { createLease } from "./lease";

const sendLeaseDraftEmailMock = vi.fn().mockResolvedValue(undefined);

const operatorSession: AuthSession = {
  userId: "user-1",
  role: "property_manager",
  organizationId: "org-1",
  capabilities: { canOwnProperties: false },
  memberships: [
    {
      id: "m-1",
      userId: "user-1",
      organizationId: "org-1",
      organizationName: "Org 1",
      role: "property_manager",
      status: "active",
      capabilities: { canOwnProperties: false },
      createdAtIso: "2026-03-31T00:00:00.000Z"
    }
  ]
};

function createTeamFunctionsRepositoryMock(permissions: string[]): TeamPermissionRepository {
  return {
    listMemberFunctions: vi.fn().mockResolvedValue([
      {
        id: "fn-1",
        organizationId: "org-1",
        functionCode: "LEASING_AGENT",
        displayName: "Leasing Agent",
        description: null,
        permissions,
        createdAt: new Date("2026-03-31T00:00:00.000Z")
      }
    ])
  };
}

function createPaymentRepositoryMock(): PaymentRepository {
  return {
    createPayment: vi.fn().mockResolvedValue({
      id: "pay-1",
      organizationId: "org-1",
      leaseId: "lease-1",
      tenantId: "tenant-1",
      amount: 200,
      currencyCode: "CDF",
      dueDate: "2026-04-01",
      paidDate: null,
      status: "pending",
      note: "Caution principale",
      paymentKind: "deposit",
      billingFrequency: "one_time",
      sourceLeaseChargeTemplateId: "charge-1",
      isInitialCharge: true,
      createdAtIso: "2026-03-31T00:00:00.000Z"
    }),
    markPaymentPaid: vi.fn(),
    listPayments: vi.fn(),
    listPaymentsByTenantAuthUserId: vi.fn(),
    getPaymentById: vi.fn(),
    updateOverduePayments: vi.fn(),
    generateMonthlyCharges: vi.fn()
  };
}

describe("createLease", () => {
  it("creates lease successfully", async () => {
    const repository: TenantLeaseRepository = {
      createLease: vi.fn().mockResolvedValue({
        id: "lease-1",
        organizationId: "org-1",
        unitId: "unit-1",
        tenantId: "tenant-1",
        startDate: "2026-04-01",
        endDate: null,
        monthlyRentAmount: 500,
        currencyCode: "CDF",
        termType: "month_to_month",
        fixedTermMonths: null,
        autoRenewToMonthly: false,
        paymentFrequency: "monthly",
        paymentStartDate: "2026-04-01",
        dueDayOfMonth: 1,
        depositAmount: 200,
        status: "pending",
        createdAtIso: "2026-03-31T00:00:00.000Z"
      }),
      createTenant: vi.fn(),
      revokeActiveTenantInvitations: vi.fn().mockResolvedValue(undefined),
      createTenantInvitation: vi.fn().mockResolvedValue({
        id: "tin-1",
        tenantId: "tenant-1",
        organizationId: "org-1",
        email: "tenant@example.com",
        tokenHash: "hash",
        expiresAtIso: "2026-04-09T00:00:00.000Z",
        createdByUserId: "user-1",
        usedAtIso: null,
        revokedAtIso: null,
        createdAtIso: "2026-03-31T00:00:00.000Z"
      }),
      getTenantInvitationPreviewByTokenHash: vi.fn(),
      markTenantInvitationUsed: vi.fn(),
      linkTenantAuthUser: vi.fn(),
      listLeasesByOrganization: vi.fn(),
      getCurrentLeaseByTenantAuthUserId: vi.fn(),
      listTenantsByOrganization: vi.fn(),
      getTenantById: vi.fn().mockResolvedValue({
        id: "tenant-1",
        organizationId: "org-1",
        authUserId: null,
        fullName: "Tenant One",
        email: "tenant@example.com",
        phone: null,
        dateOfBirth: null,
        photoUrl: null,
        createdAtIso: "2026-03-31T00:00:00.000Z"
      }),
      getLeaseById: vi.fn(),
      updateTenant: vi.fn(),
      updateLease: vi.fn(),
      deleteTenant: vi.fn()
    };
    const paymentRepository = createPaymentRepositoryMock();

    const response = await createLease(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          unitId: "unit-1",
          tenantId: "tenant-1",
          startDate: "2026-04-01",
          endDate: null,
          monthlyRentAmount: 500,
          currencyCode: "CDF",
          paymentStartDate: "2026-04-01",
          dueDayOfMonth: 1,
          charges: [
            {
              label: "Caution principale",
              chargeType: "deposit",
              amount: 200,
              currencyCode: "CDF",
              frequency: "one_time",
              startDate: "2026-04-01"
            }
          ]
        }
      },
      {
        repository,
        paymentRepository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock(["create_lease"]),
        createId: () => "lease-1",
        createPaymentId: () => "pay-1",
        sendLeaseDraftEmail: sendLeaseDraftEmailMock
      }
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(repository.createLease).toHaveBeenCalledTimes(1);
    expect(repository.createLease).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        depositAmount: 200,
        paymentFrequency: "monthly",
        dueDayOfMonth: 1,
        charges: [
          expect.objectContaining({
            chargeType: "deposit",
            amount: 200,
            startDate: "2026-04-01"
          })
        ]
      })
    );
    expect(paymentRepository.createPayment).toHaveBeenCalledTimes(2);
    expect(repository.createTenantInvitation).not.toHaveBeenCalled();
    expect(sendLeaseDraftEmailMock).toHaveBeenCalledTimes(1);
  });

  it("returns validation error when unit is not vacant", async () => {
    const repository: TenantLeaseRepository = {
      createLease: vi.fn().mockRejectedValue(new Error("UNIT_NOT_AVAILABLE")),
      createTenant: vi.fn(),
      revokeActiveTenantInvitations: vi.fn().mockResolvedValue(undefined),
      createTenantInvitation: vi.fn(),
      getTenantInvitationPreviewByTokenHash: vi.fn(),
      markTenantInvitationUsed: vi.fn(),
      linkTenantAuthUser: vi.fn(),
      listLeasesByOrganization: vi.fn(),
      getCurrentLeaseByTenantAuthUserId: vi.fn(),
      listTenantsByOrganization: vi.fn(),
      getTenantById: vi.fn(),
      getLeaseById: vi.fn(),
      updateTenant: vi.fn(),
      updateLease: vi.fn(),
      deleteTenant: vi.fn()
    };
    const paymentRepository = createPaymentRepositoryMock();

    const response = await createLease(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          unitId: "unit-1",
          tenantId: "tenant-1",
          startDate: "2026-04-01",
          endDate: null,
          monthlyRentAmount: 500,
          currencyCode: "CDF"
        }
      },
      {
        repository,
        paymentRepository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock(["create_lease"]),
        createId: () => "lease-1",
        createPaymentId: () => "pay-1",
        sendLeaseDraftEmail: sendLeaseDraftEmailMock
      }
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Unit must exist and be vacant before creating a lease"
    });
  });

  it("forbids create when property_manager lacks create_lease permission", async () => {
    const repository: TenantLeaseRepository = {
      createLease: vi.fn(),
      createTenant: vi.fn(),
      revokeActiveTenantInvitations: vi.fn().mockResolvedValue(undefined),
      createTenantInvitation: vi.fn(),
      getTenantInvitationPreviewByTokenHash: vi.fn(),
      markTenantInvitationUsed: vi.fn(),
      linkTenantAuthUser: vi.fn(),
      listLeasesByOrganization: vi.fn(),
      getCurrentLeaseByTenantAuthUserId: vi.fn(),
      listTenantsByOrganization: vi.fn(),
      getTenantById: vi.fn(),
      getLeaseById: vi.fn(),
      updateTenant: vi.fn(),
      updateLease: vi.fn(),
      deleteTenant: vi.fn()
    };
    const paymentRepository = createPaymentRepositoryMock();

    const response = await createLease(
      {
        session: operatorSession,
        body: {
          organizationId: "org-1",
          unitId: "unit-1",
          tenantId: "tenant-1",
          startDate: "2026-04-01",
          endDate: null,
          monthlyRentAmount: 500,
          currencyCode: "CDF"
        }
      },
      {
        repository,
        paymentRepository,
        teamFunctionsRepository: createTeamFunctionsRepositoryMock(["view_lease"]),
        createId: () => "lease-1",
        createPaymentId: () => "pay-1",
        sendLeaseDraftEmail: sendLeaseDraftEmailMock
      }
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Missing permission: create_lease"
    });
    expect(repository.createLease).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import type { AuthRepository, TenantLeaseRepository } from "@hhousing/data-access";
import type { Tenant } from "@hhousing/domain";
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  cancelTenantAccountDeletion,
  finalizeTenantAccountDeletions,
  hashIdentityValue,
  requestTenantAccountDeletion,
  toAccountDeletionStatus
} from "./tenant-delete-account";

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: "ten-1",
    organizationId: "org-1",
    authUserId: "auth-1",
    fullName: "Amina Tenant",
    email: "amina@example.com",
    phone: "+243900000001",
    whatsappNumber: "+243900000001",
    whatsappOptIn: true,
    dateOfBirth: null,
    photoUrl: null,
    employmentStatus: null,
    jobTitle: null,
    monthlyIncome: null,
    numberOfOccupants: null,
    accountStatus: "active",
    deletionRequestedAtIso: null,
    deletedAtIso: null,
    createdAtIso: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("tenant-delete-account", () => {
  it("schedules deletion and inactivates membership", async () => {
    const active = makeTenant();
    const pending = makeTenant({
      accountStatus: "pending_deletion",
      deletionRequestedAtIso: "2026-08-03T00:00:00.000Z"
    });

    const tenantRepository = {
      getTenantByAuthUserId: vi.fn().mockResolvedValue(active),
      requestTenantAccountDeletion: vi.fn().mockResolvedValue(pending)
    } as unknown as TenantLeaseRepository;

    const authRepository = {
      updateMembershipStatus: vi.fn().mockResolvedValue(null)
    } as unknown as AuthRepository;

    const notify = vi.fn().mockResolvedValue(undefined);

    const result = await requestTenantAccountDeletion({
      tenantRepository,
      authRepository,
      userId: "auth-1",
      organizationId: "org-1",
      notify
    });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    if (result.body.success) {
      expect(result.body.data.deletion.accountStatus).toBe("pending_deletion");
      expect(result.body.data.deletion.graceDaysRemaining).toBe(ACCOUNT_DELETION_GRACE_DAYS);
    }
    expect(authRepository.updateMembershipStatus).toHaveBeenCalledWith(
      "auth-1",
      "org-1",
      "inactive"
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "requested" })
    );
  });

  it("cancels pending deletion and restores membership", async () => {
    const pending = makeTenant({
      accountStatus: "pending_deletion",
      deletionRequestedAtIso: "2026-08-03T00:00:00.000Z"
    });
    const active = makeTenant();

    const tenantRepository = {
      getTenantByAuthUserId: vi.fn().mockResolvedValue(pending),
      cancelTenantAccountDeletion: vi.fn().mockResolvedValue(active)
    } as unknown as TenantLeaseRepository;

    const authRepository = {
      updateMembershipStatus: vi.fn().mockResolvedValue(null)
    } as unknown as AuthRepository;

    const result = await cancelTenantAccountDeletion({
      tenantRepository,
      authRepository,
      userId: "auth-1",
      organizationId: "org-1"
    });

    expect(result.status).toBe(200);
    expect(authRepository.updateMembershipStatus).toHaveBeenCalledWith(
      "auth-1",
      "org-1",
      "active"
    );
  });

  it("finalizes due deletions after grace period", async () => {
    const due = makeTenant({
      accountStatus: "pending_deletion",
      deletionRequestedAtIso: "2026-07-01T00:00:00.000Z"
    });

    const tenantRepository = {
      listTenantsNeedingDeletionReminder: vi.fn().mockResolvedValue([]),
      listTenantsPendingFinalization: vi.fn().mockResolvedValue([due]),
      finalizeTenantAccountDeletion: vi.fn().mockResolvedValue({
        authUserId: "auth-1",
        phoneNormalized: "243900000001"
      }),
      markTenantDeletionReminderSent: vi.fn()
    } as unknown as TenantLeaseRepository;

    const authRepository = {
      deleteMembershipsByUserId: vi.fn().mockResolvedValue(1)
    } as unknown as AuthRepository;

    const deleteSupabaseUser = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn().mockResolvedValue(undefined);

    const result = await finalizeTenantAccountDeletions({
      tenantRepository,
      authRepository,
      hashSalt: "test-salt",
      now: new Date("2026-08-03T00:00:00.000Z"),
      deleteSupabaseUser,
      notify
    });

    expect(result.finalized).toBe(1);
    expect(deleteSupabaseUser).toHaveBeenCalledWith("auth-1");
    expect(authRepository.deleteMembershipsByUserId).toHaveBeenCalledWith("auth-1");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "completed",
        tenant: expect.objectContaining({ email: "amina@example.com" })
      })
    );
    expect(hashIdentityValue("amina@example.com", "test-salt")).toHaveLength(64);
  });

  it("computes scheduled deletion date from grace days", () => {
    const status = toAccountDeletionStatus(
      makeTenant({
        accountStatus: "pending_deletion",
        deletionRequestedAtIso: "2026-08-01T00:00:00.000Z"
      }),
      new Date("2026-08-01T00:00:00.000Z")
    );

    expect(status.scheduledDeletionAtIso).toBe("2026-08-31T00:00:00.000Z");
    expect(status.graceDaysRemaining).toBe(30);
  });
});

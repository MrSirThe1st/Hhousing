import { createHash } from "crypto";
import type { ApiResult } from "@hhousing/api-contracts";
import type { AuthRepository, TenantLeaseRepository } from "@hhousing/data-access";
import { normalizeTenantPhoneNumber } from "@hhousing/data-access";
import type { Tenant } from "@hhousing/domain";
import { isDeliverableTenantEmail } from "./tenant-password-reset";

export const ACCOUNT_DELETION_GRACE_DAYS = 30;
export const ACCOUNT_DELETION_REMINDER_DAYS_BEFORE = 3;
export const ANONYMIZED_TENANT_FULL_NAME = "Deleted user";

export type AccountDeletionStatus = {
  accountStatus: Tenant["accountStatus"];
  deletionRequestedAtIso: string | null;
  scheduledDeletionAtIso: string | null;
  graceDaysRemaining: number | null;
};

export type AccountDeletionNotifier = (input: {
  tenant: Tenant;
  kind: "requested" | "reminder" | "completed";
  scheduledDeletionAtIso: string | null;
}) => Promise<void>;

export type DeleteSupabaseUser = (userId: string) => Promise<void>;

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function daysRemaining(scheduledIso: string, now: Date): number {
  const ms = new Date(scheduledIso).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function hashIdentityValue(value: string, salt: string): string {
  return createHash("sha256")
    .update(`${salt}:${value.trim().toLowerCase()}`)
    .digest("hex");
}

export function toAccountDeletionStatus(
  tenant: Tenant,
  now: Date = new Date()
): AccountDeletionStatus {
  if (tenant.accountStatus !== "pending_deletion" || !tenant.deletionRequestedAtIso) {
    return {
      accountStatus: tenant.accountStatus,
      deletionRequestedAtIso: tenant.deletionRequestedAtIso,
      scheduledDeletionAtIso: null,
      graceDaysRemaining: null
    };
  }

  const scheduledDeletionAtIso = addDays(
    tenant.deletionRequestedAtIso,
    ACCOUNT_DELETION_GRACE_DAYS
  );

  return {
    accountStatus: tenant.accountStatus,
    deletionRequestedAtIso: tenant.deletionRequestedAtIso,
    scheduledDeletionAtIso,
    graceDaysRemaining: daysRemaining(scheduledDeletionAtIso, now)
  };
}

async function resolveTenantForUser(
  tenantRepository: TenantLeaseRepository,
  userId: string,
  organizationId: string
): Promise<Tenant | null> {
  const byAuth = await tenantRepository.getTenantByAuthUserId(userId);
  if (byAuth && byAuth.organizationId === organizationId) {
    return byAuth;
  }

  const lease = await tenantRepository.getCurrentLeaseByTenantAuthUserId(
    userId,
    organizationId
  );
  if (!lease) {
    return null;
  }

  return tenantRepository.getTenantById(lease.tenantId, organizationId);
}

export interface RequestTenantAccountDeletionDeps {
  tenantRepository: TenantLeaseRepository;
  authRepository: AuthRepository;
  userId: string;
  organizationId: string;
  notify?: AccountDeletionNotifier;
}

export async function requestTenantAccountDeletion(
  deps: RequestTenantAccountDeletionDeps
): Promise<{ status: number; body: ApiResult<{ deletion: AccountDeletionStatus }> }> {
  const tenant = await resolveTenantForUser(
    deps.tenantRepository,
    deps.userId,
    deps.organizationId
  );

  if (!tenant?.authUserId) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Tenant profile not found" }
    };
  }

  if (tenant.accountStatus === "deleted") {
    return {
      status: 410,
      body: { success: false, code: "GONE", error: "Account has already been deleted" }
    };
  }

  if (tenant.accountStatus === "pending_deletion") {
    return {
      status: 200,
      body: {
        success: true,
        data: { deletion: toAccountDeletionStatus(tenant) }
      }
    };
  }

  const updated = await deps.tenantRepository.requestTenantAccountDeletion(
    tenant.id,
    tenant.organizationId
  );

  if (!updated) {
    return {
      status: 409,
      body: {
        success: false,
        code: "CONFLICT",
        error: "Unable to schedule account deletion"
      }
    };
  }

  await deps.authRepository.updateMembershipStatus(
    deps.userId,
    deps.organizationId,
    "inactive"
  );

  const deletion = toAccountDeletionStatus(updated);
  if (deps.notify) {
    await deps.notify({
      tenant: updated,
      kind: "requested",
      scheduledDeletionAtIso: deletion.scheduledDeletionAtIso
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      data: { deletion }
    }
  };
}

export interface CancelTenantAccountDeletionDeps {
  tenantRepository: TenantLeaseRepository;
  authRepository: AuthRepository;
  userId: string;
  organizationId: string;
}

export async function cancelTenantAccountDeletion(
  deps: CancelTenantAccountDeletionDeps
): Promise<{ status: number; body: ApiResult<{ deletion: AccountDeletionStatus }> }> {
  const tenant = await resolveTenantForUser(
    deps.tenantRepository,
    deps.userId,
    deps.organizationId
  );

  if (!tenant?.authUserId) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Tenant profile not found" }
    };
  }

  if (tenant.accountStatus === "active") {
    return {
      status: 200,
      body: {
        success: true,
        data: { deletion: toAccountDeletionStatus(tenant) }
      }
    };
  }

  if (tenant.accountStatus !== "pending_deletion") {
    return {
      status: 410,
      body: { success: false, code: "GONE", error: "Account has already been deleted" }
    };
  }

  const updated = await deps.tenantRepository.cancelTenantAccountDeletion(
    tenant.id,
    tenant.organizationId
  );

  if (!updated) {
    return {
      status: 409,
      body: {
        success: false,
        code: "CONFLICT",
        error: "Unable to cancel account deletion"
      }
    };
  }

  await deps.authRepository.updateMembershipStatus(
    deps.userId,
    deps.organizationId,
    "active"
  );

  return {
    status: 200,
    body: {
      success: true,
      data: { deletion: toAccountDeletionStatus(updated) }
    }
  };
}

export interface GetTenantAccountDeletionStatusDeps {
  tenantRepository: TenantLeaseRepository;
  userId: string;
  organizationId: string;
}

export async function getTenantAccountDeletionStatus(
  deps: GetTenantAccountDeletionStatusDeps
): Promise<{ status: number; body: ApiResult<{ deletion: AccountDeletionStatus }> }> {
  const tenant = await resolveTenantForUser(
    deps.tenantRepository,
    deps.userId,
    deps.organizationId
  );

  if (!tenant) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Tenant profile not found" }
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: { deletion: toAccountDeletionStatus(tenant) }
    }
  };
}

export interface FinalizeTenantAccountDeletionsDeps {
  tenantRepository: TenantLeaseRepository;
  authRepository: AuthRepository;
  hashSalt: string;
  now?: Date;
  deleteSupabaseUser: DeleteSupabaseUser;
  notify?: AccountDeletionNotifier;
}

export async function finalizeTenantAccountDeletions(
  deps: FinalizeTenantAccountDeletionsDeps
): Promise<{
  finalized: number;
  reminders: number;
  failures: Array<{ tenantId: string; error: string }>;
}> {
  const now = deps.now ?? new Date();
  const finalizeCutoff = new Date(now);
  finalizeCutoff.setUTCDate(finalizeCutoff.getUTCDate() - ACCOUNT_DELETION_GRACE_DAYS);

  const reminderCutoff = new Date(now);
  reminderCutoff.setUTCDate(
    reminderCutoff.getUTCDate()
    - (ACCOUNT_DELETION_GRACE_DAYS - ACCOUNT_DELETION_REMINDER_DAYS_BEFORE)
  );

  const failures: Array<{ tenantId: string; error: string }> = [];
  let finalized = 0;
  let reminders = 0;

  const reminderTenants = await deps.tenantRepository.listTenantsNeedingDeletionReminder(
    reminderCutoff.toISOString(),
    finalizeCutoff.toISOString()
  );

  for (const tenant of reminderTenants) {
    try {
      if (deps.notify) {
        await deps.notify({
          tenant,
          kind: "reminder",
          scheduledDeletionAtIso: addDays(
            tenant.deletionRequestedAtIso!,
            ACCOUNT_DELETION_GRACE_DAYS
          )
        });
      }
      await deps.tenantRepository.markTenantDeletionReminderSent(
        tenant.id,
        tenant.organizationId
      );
      reminders += 1;
    } catch (error) {
      failures.push({
        tenantId: tenant.id,
        error: error instanceof Error ? error.message : "Reminder failed"
      });
    }
  }

  const dueTenants = await deps.tenantRepository.listTenantsPendingFinalization(
    finalizeCutoff.toISOString()
  );

  for (const tenant of dueTenants) {
    const contactEmail = isDeliverableTenantEmail(tenant.email)
      ? tenant.email.trim()
      : null;
    const contactName = tenant.fullName;

    try {
      const emailHash = contactEmail
        ? hashIdentityValue(contactEmail, deps.hashSalt)
        : null;
      const phoneNormalized = tenant.phone
        ? normalizeTenantPhoneNumber(tenant.phone)
        : null;
      const phoneHash = phoneNormalized
        ? hashIdentityValue(phoneNormalized, deps.hashSalt)
        : null;

      const result = await deps.tenantRepository.finalizeTenantAccountDeletion({
        tenantId: tenant.id,
        organizationId: tenant.organizationId,
        emailHash,
        phoneHash,
        anonymizedFullName: ANONYMIZED_TENANT_FULL_NAME
      });

      if (!result) {
        continue;
      }

      if (result.authUserId) {
        await deps.authRepository.deleteMembershipsByUserId(result.authUserId);
        await deps.deleteSupabaseUser(result.authUserId);
      }

      if (deps.notify && contactEmail) {
        await deps.notify({
          tenant: {
            ...tenant,
            fullName: contactName,
            email: contactEmail,
            accountStatus: "deleted",
            deletedAtIso: now.toISOString(),
            authUserId: null,
            phone: null
          },
          kind: "completed",
          scheduledDeletionAtIso: null
        });
      }

      finalized += 1;
    } catch (error) {
      failures.push({
        tenantId: tenant.id,
        error: error instanceof Error ? error.message : "Finalization failed"
      });
    }
  }

  return { finalized, reminders, failures };
}

import type { ApiResult } from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import { normalizeTenantPhoneNumber } from "@hhousing/data-access";
import { isDeliverableTenantEmail } from "./tenant-password-reset";

function buildSyntheticEmail(phoneNormalized: string): string {
  return `${phoneNormalized}@phone.tenant.harakaproperty.local`;
}

async function verifyPassword(params: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  email: string;
  password: string;
}): Promise<boolean> {
  const response = await fetch(`${params.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: params.supabaseAnonKey
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password
    })
  });
  return response.ok;
}

async function updateUserPassword(params: {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  userId: string;
  password: string;
}): Promise<boolean> {
  const response = await fetch(
    `${params.supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(params.userId)}`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        apikey: params.supabaseServiceRoleKey,
        Authorization: `Bearer ${params.supabaseServiceRoleKey}`
      },
      body: JSON.stringify({
        password: params.password
      })
    }
  );
  return response.ok;
}

export interface ChangeTenantPasswordDeps {
  tenantRepository: TenantLeaseRepository;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  userId: string;
  organizationId: string;
}

export async function changeTenantPassword(
  body: unknown,
  deps: ChangeTenantPasswordDeps
): Promise<{ status: number; body: ApiResult<{ message: string }> }> {
  if (typeof body !== "object" || body === null) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" }
    };
  }

  const currentPassword =
    typeof (body as { currentPassword?: unknown }).currentPassword === "string"
      ? (body as { currentPassword: string }).currentPassword
      : "";
  const newPassword =
    typeof (body as { newPassword?: unknown }).newPassword === "string"
      ? (body as { newPassword: string }).newPassword
      : "";

  if (currentPassword.length < 8) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Current password must be at least 8 characters"
      }
    };
  }

  if (newPassword.length < 8) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "New password must be at least 8 characters"
      }
    };
  }

  if (currentPassword === newPassword) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "New password must be different from the current password"
      }
    };
  }

  const lease = await deps.tenantRepository.getCurrentLeaseByTenantAuthUserId(
    deps.userId,
    deps.organizationId
  );
  if (!lease) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "No active lease found" }
    };
  }

  const tenant = await deps.tenantRepository.getTenantById(lease.tenantId, deps.organizationId);
  if (!tenant?.authUserId) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Tenant profile not found" }
    };
  }

  const phoneNormalized = tenant.phone ? normalizeTenantPhoneNumber(tenant.phone) : null;
  const emailsToTry = [
    isDeliverableTenantEmail(tenant.email) ? tenant.email.trim() : null,
    phoneNormalized ? buildSyntheticEmail(phoneNormalized) : null
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

  let currentOk = false;
  for (const email of emailsToTry) {
    currentOk = await verifyPassword({
      supabaseUrl: deps.supabaseUrl,
      supabaseAnonKey: deps.supabaseAnonKey,
      email,
      password: currentPassword
    });
    if (currentOk) {
      break;
    }
  }

  if (!currentOk) {
    return {
      status: 401,
      body: {
        success: false,
        code: "UNAUTHORIZED",
        error: "Current password is incorrect"
      }
    };
  }

  const updated = await updateUserPassword({
    supabaseUrl: deps.supabaseUrl,
    supabaseServiceRoleKey: deps.supabaseServiceRoleKey,
    userId: tenant.authUserId,
    password: newPassword
  });

  if (!updated) {
    return {
      status: 500,
      body: {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Unable to update password. Please try again."
      }
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: { message: "Password updated successfully" }
    }
  };
}

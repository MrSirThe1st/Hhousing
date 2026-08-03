import type { ApiResult } from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import type { Tenant } from "@hhousing/domain";
import { normalizeTenantPhoneNumber } from "@hhousing/data-access";

const SYNTHETIC_EMAIL_SUFFIX = "@phone.tenant.harakaproperty.local";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists, we’ve sent a reset link. Check your email (and spam folder).";

export function isDeliverableTenantEmail(email: string | null | undefined): email is string {
  const trimmed = email?.trim() ?? "";
  if (!trimmed || !trimmed.includes("@")) {
    return false;
  }
  return !trimmed.toLowerCase().endsWith(SYNTHETIC_EMAIL_SUFFIX);
}

async function sendPasswordResetEmail(params: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  email: string;
  redirectTo: string;
}): Promise<boolean> {
  const url = new URL(`${params.supabaseUrl}/auth/v1/recover`);
  url.searchParams.set("redirect_to", params.redirectTo);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: params.supabaseAnonKey,
      Authorization: `Bearer ${params.supabaseAnonKey}`
    },
    body: JSON.stringify({
      email: params.email
    })
  });

  return response.ok;
}

export interface RequestTenantPasswordResetDeps {
  tenantRepository: TenantLeaseRepository;
  supabaseUrl: string;
  supabaseAnonKey: string;
  redirectTo: string;
}

export async function requestTenantPasswordReset(
  body: unknown,
  deps: RequestTenantPasswordResetDeps
): Promise<{ status: number; body: ApiResult<{ message: string }> }> {
  const genericSuccess = {
    status: 200,
    body: {
      success: true as const,
      data: { message: GENERIC_SUCCESS_MESSAGE }
    }
  };

  if (typeof body !== "object" || body === null) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" }
    };
  }

  const rawPhone =
    typeof (body as { phone?: unknown }).phone === "string"
      ? (body as { phone: string }).phone.trim()
      : "";
  const rawEmail =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";

  if (!rawPhone && !rawEmail) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Phone number or email is required"
      }
    };
  }

  if (rawPhone && rawEmail) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Provide either a phone number or an email, not both"
      }
    };
  }

  let tenant: Tenant | null = null;

  try {
    if (rawPhone) {
      const phoneNormalized = normalizeTenantPhoneNumber(rawPhone);
      if (!phoneNormalized) {
        return genericSuccess;
      }
      tenant = await deps.tenantRepository.findTenantByNormalizedPhone(phoneNormalized);
    } else {
      if (!rawEmail.includes("@")) {
        return genericSuccess;
      }
      tenant = await deps.tenantRepository.findTenantByEmail(rawEmail);
    }

    if (!tenant?.authUserId) {
      return genericSuccess;
    }

    const email = isDeliverableTenantEmail(tenant.email) ? tenant.email.trim() : null;
    if (!email) {
      // No deliverable email — still return generic success; client shows landlord fallback.
      return genericSuccess;
    }

    if (!deps.supabaseUrl || !deps.supabaseAnonKey) {
      return genericSuccess;
    }

    await sendPasswordResetEmail({
      supabaseUrl: deps.supabaseUrl,
      supabaseAnonKey: deps.supabaseAnonKey,
      email,
      redirectTo: deps.redirectTo
    });
  } catch (error) {
    console.error("Tenant password reset request failed", error);
  }

  return genericSuccess;
}

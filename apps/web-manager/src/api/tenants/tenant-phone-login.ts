import { createHash } from "crypto";
import type { ApiResult } from "@hhousing/api-contracts";
import type { TenantLeaseRepository } from "@hhousing/data-access";
import { normalizeTenantPhoneNumber } from "@hhousing/data-access";

function buildSyntheticEmail(phoneNormalized: string): string {
  return `${phoneNormalized}@phone.tenant.harakaproperty.local`;
}

async function createPasswordSession(params: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  email: string;
  password: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
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

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token || !payload.refresh_token) {
    return null;
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in ?? 3600
  };
}

export interface LoginTenantWithPhonePasswordDeps {
  tenantRepository: TenantLeaseRepository;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export async function loginTenantWithPhonePassword(
  body: unknown,
  deps: LoginTenantWithPhonePasswordDeps
): Promise<{
  status: number;
  body: ApiResult<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tenantId: string;
    organizationId: string;
  }>;
}> {
  if (typeof body !== "object" || body === null) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" }
    };
  }

  const rawPhone = typeof (body as { phone?: unknown }).phone === "string"
    ? (body as { phone: string }).phone.trim()
    : "";
  const password = typeof (body as { password?: unknown }).password === "string"
    ? (body as { password: string }).password
    : "";
  const phoneNormalized = normalizeTenantPhoneNumber(rawPhone);

  if (!phoneNormalized || password.length < 1) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Numéro de téléphone et mot de passe requis"
      }
    };
  }

  const tenant = await deps.tenantRepository.findTenantByNormalizedPhone(phoneNormalized);
  if (!tenant || !tenant.authUserId) {
    return {
      status: 401,
      body: {
        success: false,
        code: "UNAUTHORIZED",
        error: "Identifiants incorrects"
      }
    };
  }

  const emailsToTry = [
    tenant.email?.trim() || null,
    buildSyntheticEmail(phoneNormalized)
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

  for (const email of emailsToTry) {
    const session = await createPasswordSession({
      supabaseUrl: deps.supabaseUrl,
      supabaseAnonKey: deps.supabaseAnonKey,
      email,
      password
    });

    if (session) {
      return {
        status: 200,
        body: {
          success: true,
          data: {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            expiresIn: session.expiresIn,
            tenantId: tenant.id,
            organizationId: tenant.organizationId
          }
        }
      };
    }
  }

  // Touch hash to avoid unused import if tree-shaken oddly in some builds; keep timing steady-ish.
  void createHash("sha256").update(password).digest("hex");

  return {
    status: 401,
    body: {
      success: false,
      code: "UNAUTHORIZED",
      error: "Identifiants incorrects"
    }
  };
}

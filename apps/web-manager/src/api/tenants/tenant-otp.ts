import { createHash, randomInt, randomBytes } from "crypto";
import type { ApiResult } from "@hhousing/api-contracts";
import type { AuthRepository, TenantLeaseRepository, TenantLoginOtpRepository } from "@hhousing/data-access";
import { normalizeTenantPhoneNumber } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus } from "../shared/error-http-status";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function buildSyntheticEmail(phoneNormalized: string): string {
  return `${phoneNormalized}@phone.tenant.harakaproperty.local`;
}

function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

function generateSessionPassword(): string {
  return `otp_${randomBytes(24).toString("hex")}`;
}

async function findSupabaseUserByEmail(
  supabaseAdminUrl: string,
  supabaseServiceRoleKey: string,
  email: string
): Promise<{ id: string; email: string } | null> {
  const response = await fetch(`${supabaseAdminUrl}/auth/v1/admin/users?per_page=200`, {
    method: "GET",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`SUPABASE_LOOKUP_FAILED:${response.status}`);
  }

  const payload = (await response.json()) as { users?: Array<{ id: string; email?: string }> };
  const normalizedEmail = email.toLowerCase();
  const user = payload.users?.find((item) => item.email?.toLowerCase() === normalizedEmail);
  return user?.email ? { id: user.id, email: user.email } : null;
}

async function upsertSupabaseUser(params: {
  supabaseAdminUrl: string;
  supabaseServiceRoleKey: string;
  email: string;
  password: string;
  phone: string;
}): Promise<string> {
  const existingUser = await findSupabaseUserByEmail(
    params.supabaseAdminUrl,
    params.supabaseServiceRoleKey,
    params.email
  );

  const endpoint = existingUser
    ? `${params.supabaseAdminUrl}/auth/v1/admin/users/${existingUser.id}`
    : `${params.supabaseAdminUrl}/auth/v1/admin/users`;
  const method = existingUser ? "PUT" : "POST";

  const response = await fetch(endpoint, {
    method,
    headers: {
      "content-type": "application/json",
      apikey: params.supabaseServiceRoleKey,
      Authorization: `Bearer ${params.supabaseServiceRoleKey}`
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      email_confirm: true,
      phone: `+${params.phone}`,
      phone_confirm: true,
      user_metadata: { phone: params.phone, authMethod: "whatsapp_otp" }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SUPABASE_USER_UPSERT_FAILED:${response.status}:${text}`);
  }

  const payload = (await response.json()) as { id: string };
  return payload.id;
}

async function createPasswordSession(params: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  email: string;
  password: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
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
    const text = await response.text();
    throw new Error(`SUPABASE_SESSION_FAILED:${response.status}:${text}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token || !payload.refresh_token) {
    throw new Error("SUPABASE_SESSION_MISSING_TOKENS");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in ?? 3600
  };
}

export interface RequestTenantOtpDeps {
  tenantRepository: TenantLeaseRepository;
  otpRepository: TenantLoginOtpRepository;
  createOtpId: () => string;
  sendOtpWhatsApp: (input: {
    organizationId: string;
    tenantId: string;
    to: string;
    code: string;
    tenantFullName: string;
  }) => Promise<void>;
}

export async function requestTenantLoginOtp(
  body: unknown,
  deps: RequestTenantOtpDeps
): Promise<{ status: number; body: ApiResult<{ phoneNormalized: string; expiresInSeconds: number }> }> {
  if (typeof body !== "object" || body === null) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" }
    };
  }

  const rawPhone = typeof (body as { phone?: unknown }).phone === "string"
    ? (body as { phone: string }).phone.trim()
    : "";
  const phoneNormalized = normalizeTenantPhoneNumber(rawPhone);

  if (!phoneNormalized) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Numéro de téléphone invalide" }
    };
  }

  const tenant = await deps.tenantRepository.findTenantByNormalizedPhone(phoneNormalized);
  if (!tenant) {
    // Do not leak whether the phone exists.
    return {
      status: 200,
      body: {
        success: true,
        data: {
          phoneNormalized,
          expiresInSeconds: Math.floor(OTP_TTL_MS / 1000)
        }
      }
    };
  }

  if (!tenant.whatsappOptIn) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "WhatsApp n'est pas activé pour ce locataire"
      }
    };
  }

  await deps.otpRepository.invalidateActiveOtps(phoneNormalized);

  const code = generateOtpCode();
  const expiresAtIso = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await deps.otpRepository.createOtp({
    id: deps.createOtpId(),
    organizationId: tenant.organizationId,
    tenantId: tenant.id,
    phoneNormalized,
    codeHash: hashOtpCode(code),
    expiresAtIso
  });

  try {
    await deps.sendOtpWhatsApp({
      organizationId: tenant.organizationId,
      tenantId: tenant.id,
      to: phoneNormalized,
      code,
      tenantFullName: tenant.fullName
    });
  } catch (error) {
    console.error("Failed to send tenant login OTP via WhatsApp", error);
    return {
      status: 502,
      body: {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Impossible d'envoyer le code WhatsApp. Réessayez."
      }
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        phoneNormalized,
        expiresInSeconds: Math.floor(OTP_TTL_MS / 1000)
      }
    }
  };
}

export interface VerifyTenantOtpDeps {
  tenantRepository: TenantLeaseRepository;
  otpRepository: TenantLoginOtpRepository;
  authRepository: AuthRepository;
  createMembershipId: () => string;
  supabaseAdminUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
}

export async function verifyTenantLoginOtp(
  body: unknown,
  deps: VerifyTenantOtpDeps
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
  const code = typeof (body as { code?: unknown }).code === "string"
    ? (body as { code: string }).code.trim()
    : "";
  const phoneNormalized = normalizeTenantPhoneNumber(rawPhone);

  if (!phoneNormalized || !/^\d{6}$/.test(code)) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Téléphone et code à 6 chiffres requis" }
    };
  }

  const otp = await deps.otpRepository.getLatestActiveOtp(phoneNormalized);
  if (!otp) {
    return {
      status: 401,
      body: { success: false, code: "UNAUTHORIZED", error: "Code invalide ou expiré" }
    };
  }

  if (otp.attemptCount >= MAX_ATTEMPTS) {
    await deps.otpRepository.markConsumed(otp.id);
    return {
      status: 401,
      body: { success: false, code: "UNAUTHORIZED", error: "Trop de tentatives. Demandez un nouveau code." }
    };
  }

  if (otp.codeHash !== hashOtpCode(code)) {
    await deps.otpRepository.incrementAttemptCount(otp.id);
    return {
      status: 401,
      body: { success: false, code: "UNAUTHORIZED", error: "Code invalide ou expiré" }
    };
  }

  const tenant = await deps.tenantRepository.getTenantById(otp.tenantId, otp.organizationId);
  if (!tenant) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Locataire introuvable" }
    };
  }

  const email = tenant.email?.trim() || buildSyntheticEmail(phoneNormalized);
  const sessionPassword = generateSessionPassword();

  try {
    const userId = await upsertSupabaseUser({
      supabaseAdminUrl: deps.supabaseAdminUrl,
      supabaseServiceRoleKey: deps.supabaseServiceRoleKey,
      email,
      password: sessionPassword,
      phone: phoneNormalized
    });

    const existingMembership = await deps.authRepository.getMembershipByUserAndOrg(
      userId,
      tenant.organizationId
    );

    if (existingMembership && existingMembership.role !== "tenant") {
      return {
        status: 409,
        body: {
          success: false,
          code: "FORBIDDEN",
          error: "Ce numéro est déjà lié à un compte non-locataire"
        }
      };
    }

    if (!existingMembership) {
      await deps.authRepository.createOrganizationMembership({
        id: deps.createMembershipId(),
        organizationId: tenant.organizationId,
        userId,
        role: "tenant",
        status: "active",
        canOwnProperties: false
      });
    }

    if (!tenant.authUserId) {
      await deps.tenantRepository.linkTenantAuthUser(
        tenant.id,
        tenant.organizationId,
        userId,
        phoneNormalized
      );
    }

    const session = await createPasswordSession({
      supabaseUrl: deps.supabaseAdminUrl,
      supabaseAnonKey: deps.supabaseAnonKey,
      email,
      password: sessionPassword
    });

    await deps.otpRepository.markConsumed(otp.id);

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
  } catch (error) {
    console.error("Failed to verify tenant login OTP", error);
    return {
      status: mapErrorCodeToHttpStatus("INTERNAL_ERROR"),
      body: {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Connexion impossible. Réessayez."
      }
    };
  }
}

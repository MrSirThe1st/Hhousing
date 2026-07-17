import { createAuthRepo, createId, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../../../shared";
import { createTenantLoginOtpRepositoryFromEnv } from "@hhousing/data-access";
import { verifyTenantLoginOtp } from "../../../../../../api/tenants/tenant-otp";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? "";

  if (!supabaseAdminUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Supabase auth is not configured"
    });
  }

  const result = await verifyTenantLoginOtp(body, {
    tenantRepository: createTenantLeaseRepo(),
    otpRepository: createTenantLoginOtpRepositoryFromEnv(process.env),
    authRepository: createAuthRepo(),
    createMembershipId: () => createId("mem"),
    supabaseAdminUrl,
    supabaseServiceRoleKey,
    supabaseAnonKey
  });

  return jsonResponse(result.status, result.body);
}

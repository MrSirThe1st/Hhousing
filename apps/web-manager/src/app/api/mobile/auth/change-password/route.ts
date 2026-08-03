import { extractTenantSessionFromRequest } from "../../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../../api/shared";
import { changeTenantPassword } from "../../../../../api/tenants/tenant-change-password";
import { createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../../shared";

export async function OPTIONS(): Promise<Response> {
  return jsonResponse(204, null, new Request("http://localhost"));
}

export async function POST(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access, request);
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    }, request);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Supabase auth is not configured"
    }, request);
  }

  const result = await changeTenantPassword(body, {
    tenantRepository: createTenantLeaseRepo(),
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    userId: access.data.userId,
    organizationId: access.data.organizationId
  });

  return jsonResponse(result.status, result.body, request);
}

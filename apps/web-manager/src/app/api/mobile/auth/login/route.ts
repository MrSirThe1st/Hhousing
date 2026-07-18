import { createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../../shared";
import { loginTenantWithPhonePassword } from "../../../../../api/tenants/tenant-phone-login";

export async function OPTIONS(): Promise<Response> {
  return jsonResponse(204, null, new Request("http://localhost"));
}

export async function POST(request: Request): Promise<Response> {
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

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Supabase auth is not configured"
    }, request);
  }

  const result = await loginTenantWithPhonePassword(body, {
    tenantRepository: createTenantLeaseRepo(),
    supabaseUrl,
    supabaseAnonKey
  });

  return jsonResponse(result.status, result.body, request);
}

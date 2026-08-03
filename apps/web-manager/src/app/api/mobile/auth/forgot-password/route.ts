import { createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../../shared";
import { requestTenantPasswordReset } from "../../../../../api/tenants/tenant-password-reset";

function resolveRedirectTo(request: Request): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || "";

  const origin = configured
    ? configured.replace(/\/$/, "")
    : new URL(request.url).origin;

  const nextPath = "/tenant/reset-password";
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

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

  const result = await requestTenantPasswordReset(body, {
    tenantRepository: createTenantLeaseRepo(),
    supabaseUrl,
    supabaseAnonKey,
    redirectTo: resolveRedirectTo(request)
  });

  return jsonResponse(result.status, result.body, request);
}

import { acceptTenantInvitation } from "../../../../../api";
import { createAuthRepo, createId, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../../shared";

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

  const result = await acceptTenantInvitation(
    {
      body
    },
    {
      repository: createTenantLeaseRepo(),
      authRepository: createAuthRepo(),
      createMembershipId: () => createId("mem"),
      supabaseAdminUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    }
  );

  return jsonResponse(result.status, result.body);
}
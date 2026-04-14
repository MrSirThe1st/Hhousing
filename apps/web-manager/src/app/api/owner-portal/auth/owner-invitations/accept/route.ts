import { createOwnerPortalAccessRepositoryFromEnv } from "@hhousing/data-access";
import { jsonResponse, createId, parseJsonBody } from "@/app/api/shared";
import { getCurrentAuthenticatedUser } from "@/lib/owner-portal/current-user";
import { acceptOwnerInvitation } from "@/lib/owner-portal/owner-invitations";

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

  const result = await acceptOwnerInvitation(
    {
      body,
      currentUser: await getCurrentAuthenticatedUser()
    },
    {
      repository: createOwnerPortalAccessRepositoryFromEnv(process.env),
      createId: () => createId("opa"),
      supabaseAdminUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  );

  return jsonResponse(result.status, result.body);
}

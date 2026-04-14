import { createOwnerPortalAccessRepositoryFromEnv } from "@hhousing/data-access";
import { validateOwnerInvitation } from "@/lib/owner-portal/owner-invitations";
import { jsonResponse } from "@/app/api/shared";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const result = await validateOwnerInvitation(
    {
      token: searchParams.get("token")
    },
    {
      repository: createOwnerPortalAccessRepositoryFromEnv(process.env),
      supabaseAdminUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  );

  return jsonResponse(result.status, result.body);
}

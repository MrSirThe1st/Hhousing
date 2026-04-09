import { validateTeamMemberInvitation } from "../../../../../api";
import { createAuthRepo, jsonResponse } from "../../../shared";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const result = await validateTeamMemberInvitation(
    {
      token: searchParams.get("token")
    },
    {
      repository: createAuthRepo(),
      supabaseAdminUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  );

  return jsonResponse(result.status, result.body);
}
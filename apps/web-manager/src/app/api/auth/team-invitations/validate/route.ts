import { validateTeamMemberInvitation } from "../../../../../api";
import { createAuthRepo, jsonResponse } from "../../../shared";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const result = await validateTeamMemberInvitation(
    {
      token: searchParams.get("token")
    },
    {
      repository: createAuthRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}
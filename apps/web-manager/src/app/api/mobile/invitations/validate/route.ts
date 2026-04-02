import { validateTenantInvitation } from "../../../../../api";
import { createTenantLeaseRepo, jsonResponse } from "../../../shared";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const result = await validateTenantInvitation(
    {
      token: searchParams.get("token")
    },
    {
      repository: createTenantLeaseRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}
import { listTenantConversations } from "../../../../../api";
import { extractAuthSessionFromRequest } from "../../../../../auth/session-adapter";
import { createMessageRepo, jsonResponse } from "../../../shared";

export async function GET(request: Request): Promise<Response> {
  const result = await listTenantConversations(
    {
      session: await extractAuthSessionFromRequest(request)
    },
    {
      repository: createMessageRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

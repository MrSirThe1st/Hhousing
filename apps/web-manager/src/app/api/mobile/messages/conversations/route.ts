import { listTenantConversations } from "../../../../../api";
import { mapErrorCodeToHttpStatus } from "../../../../../api/shared";
import { extractTenantSessionFromRequest } from "../../../../../auth/session-adapter";
import { createMessageRepo, jsonResponse } from "../../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const result = await listTenantConversations(
    {
      session: access.data
    },
    {
      repository: createMessageRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

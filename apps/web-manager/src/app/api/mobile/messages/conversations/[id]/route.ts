import { getTenantConversationDetail } from "../../../../../../api";
import { mapErrorCodeToHttpStatus } from "../../../../../../api/shared";
import { extractTenantSessionFromRequest } from "../../../../../../auth/session-adapter";
import { createMessageRepo, jsonResponse } from "../../../../shared";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const result = await getTenantConversationDetail(
    {
      session: access.data,
      conversationId: id
    },
    {
      repository: createMessageRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

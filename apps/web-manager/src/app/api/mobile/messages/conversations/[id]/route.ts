import { getTenantConversationDetail } from "../../../../../../api";
import { extractAuthSessionFromRequest } from "../../../../../../auth/session-adapter";
import { createMessageRepo, jsonResponse } from "../../../../shared";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const { id } = await params;

  const result = await getTenantConversationDetail(
    {
      session: await extractAuthSessionFromRequest(request),
      conversationId: id
    },
    {
      repository: createMessageRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

import { getManagerConversationDetail } from "../../../../../api";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import {
  createMessageRepo,
  createTeamFunctionsRepo,
  jsonResponse
} from "../../../shared";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const { id } = await params;

  const result = await getManagerConversationDetail(
    {
      session: await extractAuthSessionFromCookies(),
      conversationId: id
    },
    {
      repository: createMessageRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

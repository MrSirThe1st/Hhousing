import { getManagerConversationDetail } from "../../../../../api";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../../lib/operator-scope-portfolio";
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
  const session = await extractAuthSessionFromCookies();

  const result = await getManagerConversationDetail(
    {
      session,
      conversationId: id
    },
    {
      repository: createMessageRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  if (result.body.success && session !== null) {
    const scopedPortfolio = await getScopedPortfolioData(session);
    if (!scopedPortfolio.propertyIds.has(result.body.data.context.unit.propertyId)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Conversation not found"
      });
    }
  }

  return jsonResponse(result.status, result.body);
}

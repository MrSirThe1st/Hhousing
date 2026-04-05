import { sendManagerMessage } from "../../../../../../api";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../../../lib/operator-scope-portfolio";
import {
  createId,
  createMessageRepo,
  createTeamFunctionsRepo,
  jsonResponse,
  parseJsonBody
} from "../../../../shared";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();
  const messageRepo = createMessageRepo();

  let body: unknown;

  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  if (session !== null) {
    const detail = await messageRepo.getManagerConversationDetail(id, session.organizationId);
    if (!detail) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Conversation not found"
      });
    }

    const scopedPortfolio = await getScopedPortfolioData(session);
    if (!scopedPortfolio.propertyIds.has(detail.context.unit.propertyId)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Conversation not found"
      });
    }
  }

  const result = await sendManagerMessage(
    {
      session,
      conversationId: id,
      body
    },
    {
      repository: messageRepo,
      createId,
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

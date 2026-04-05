import {
  listManagerConversations,
  startManagerConversation
} from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import {
  filterManagerConversationsByScope,
  getScopedPortfolioData
} from "../../../../lib/operator-scope-portfolio";
import {
  createId,
  createMessageRepo,
  createTeamFunctionsRepo,
  jsonResponse,
  parseJsonBody
} from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const session = await extractAuthSessionFromCookies();

  const result = await listManagerConversations(
    {
      session,
      propertyId: searchParams.get("propertyId"),
      q: searchParams.get("q")
    },
    {
      repository: createMessageRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  if (result.body.success && session !== null) {
    const scopedPortfolio = await getScopedPortfolioData(session);
    return jsonResponse(result.status, {
      success: true,
      data: {
        conversations: filterManagerConversationsByScope(result.body.data.conversations, scopedPortfolio)
      }
    });
  }

  return jsonResponse(result.status, result.body);
}

export async function POST(request: Request): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
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

  if (session !== null && typeof body === "object" && body !== null) {
    const payload = body as Record<string, unknown>;
    const tenantId = typeof payload.tenantId === "string" ? payload.tenantId : null;

    if (tenantId !== null) {
      const scopedPortfolio = await getScopedPortfolioData(session);
      if (!scopedPortfolio.tenantIds.has(tenantId)) {
        return jsonResponse(404, {
          success: false,
          code: "NOT_FOUND",
          error: "Tenant not found"
        });
      }
    }
  }

  const result = await startManagerConversation(
    {
      session,
      body
    },
    {
      repository: createMessageRepo(),
      createId,
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

import {
  listManagerConversations,
  startManagerConversation
} from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import {
  createId,
  createMessageRepo,
  createTeamFunctionsRepo,
  jsonResponse,
  parseJsonBody
} from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const result = await listManagerConversations(
    {
      session: await extractAuthSessionFromCookies(),
      propertyId: searchParams.get("propertyId"),
      q: searchParams.get("q")
    },
    {
      repository: createMessageRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function POST(request: Request): Promise<Response> {
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

  const result = await startManagerConversation(
    {
      session: await extractAuthSessionFromCookies(),
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

import { sendManagerMessage } from "../../../../../../api";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
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

  const result = await sendManagerMessage(
    {
      session: await extractAuthSessionFromCookies(),
      conversationId: id,
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

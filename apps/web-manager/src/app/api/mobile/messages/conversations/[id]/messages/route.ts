import { sendTenantMessage } from "../../../../../../../api";
import { extractAuthSessionFromRequest } from "../../../../../../../auth/session-adapter";
import {
  createId,
  createMessageRepo,
  jsonResponse,
  parseJsonBody
} from "../../../../../shared";

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

  const result = await sendTenantMessage(
    {
      session: await extractAuthSessionFromRequest(request),
      conversationId: id,
      body
    },
    {
      repository: createMessageRepo(),
      createId
    }
  );

  return jsonResponse(result.status, result.body);
}

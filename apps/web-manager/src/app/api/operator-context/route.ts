import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { getServerOperatorContext } from "../../../lib/operator-context";
import { jsonResponse } from "../shared";

export async function GET(): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  if (session === null) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  const context = await getServerOperatorContext(session);

  return jsonResponse(200, {
    success: true,
    data: context
  });
}

export async function POST(request: Request): Promise<Response> {
  void request;

  const session = await extractAuthSessionFromCookies();
  if (session === null) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  return jsonResponse(405, {
    success: false,
    code: "METHOD_NOT_ALLOWED",
    error: "Operator scope switching has been removed"
  });
}
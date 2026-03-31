import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { jsonResponse } from "../shared";

export async function GET(): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  if (!session) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Not authenticated"
    });
  }

  return jsonResponse(200, {
    success: true,
    data: {
      userId: session.userId,
      organizationId: session.organizationId ?? "",
      role: session.role
    }
  });
}

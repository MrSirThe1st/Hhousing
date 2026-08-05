import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { jsonResponse } from "../../../shared";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const { id } = await context.params;

  try {
    const repo = createPlatformAdminRepositoryFromEnv(process.env);
    const data = await repo.getUserDetail(id);
    if (data === null) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "User not found"
      });
    }
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to load platform user", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to load user"
    });
  }
}

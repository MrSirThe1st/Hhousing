import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { jsonResponse } from "../../shared";

export async function GET(): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  try {
    const repo = createPlatformAdminRepositoryFromEnv(process.env);
    const data = await repo.getOverviewStats();
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to load platform admin overview", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to load overview"
    });
  }
}

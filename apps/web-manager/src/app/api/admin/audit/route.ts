import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { jsonResponse } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;
  const actionKey = url.searchParams.get("actionKey");
  const entityType = url.searchParams.get("entityType");

  try {
    const repo = createPlatformAdminRepositoryFromEnv(process.env);
    const data = await repo.listPlatformAuditLogs({
      limit,
      actionKey,
      entityType
    });
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to list platform audit logs", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to list audit logs"
    });
  }
}

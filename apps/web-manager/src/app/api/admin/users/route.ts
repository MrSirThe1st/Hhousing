import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import type { PlatformUserAccountStatus } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { jsonResponse } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const accountStatusParam = url.searchParams.get("status");
  const accountStatus =
    accountStatusParam === "active" || accountStatusParam === "suspended"
      ? (accountStatusParam as PlatformUserAccountStatus)
      : null;

  try {
    const repo = createPlatformAdminRepositoryFromEnv(process.env);
    const data = await repo.listUsers({
      search,
      accountStatus,
      limit: 100,
      offset: 0
    });
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to list platform users", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to list users"
    });
  }
}

import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import type { OrganizationPlatformStatus } from "@hhousing/data-access";
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
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "active" || statusParam === "suspended"
      ? (statusParam as OrganizationPlatformStatus)
      : null;

  try {
    const repo = createPlatformAdminRepositoryFromEnv(process.env);
    const data = await repo.listOrganizations({
      search,
      status,
      limit: 100,
      offset: 0
    });
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to list platform organizations", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to list organizations"
    });
  }
}

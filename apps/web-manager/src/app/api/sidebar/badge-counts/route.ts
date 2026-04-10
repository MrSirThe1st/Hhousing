import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { requireOperatorSession, mapErrorCodeToHttpStatus } from "../../../../api/shared";
import { getSidebarBadgeCounts } from "../../../../lib/sidebar-badge-counts";
import { jsonResponse } from "../../shared";

export async function GET(): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const counts = await getSidebarBadgeCounts(access.data);

  return jsonResponse(200, {
    success: true,
    data: counts
  });
}
import { createMarketplaceRepo, jsonResponse } from "../../shared";
import { extractUserIdFromRequest } from "../../../../auth/session-adapter";

export async function GET(request: Request): Promise<Response> {
  const userId = await extractUserIdFromRequest(request);
  if (!userId) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  const repo = createMarketplaceRepo();
  const items = await repo.listViewingRequestsForUser(userId);

  return jsonResponse(200, {
    success: true,
    data: { items }
  });
}

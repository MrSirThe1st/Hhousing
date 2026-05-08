import { extractTenantSessionFromRequest } from "../../../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../../../api/shared";
import { jsonResponse } from "../../../../shared";

export async function POST(
  request: Request,
  _context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  return jsonResponse(403, {
    success: false,
    code: "FORBIDDEN",
    error: "Les paiements sont validés manuellement par l'administration."
  });
}

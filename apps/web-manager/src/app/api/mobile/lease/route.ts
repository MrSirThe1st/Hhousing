import { extractTenantSessionFromRequest } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../api/shared";
import { createTenantLeaseRepo, jsonResponse } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repository = createTenantLeaseRepo();

  try {
    const lease = await repository.getCurrentLeaseByTenantAuthUserId(
      access.data.userId,
      access.data.organizationId
    );

    return jsonResponse(200, {
      success: true,
      data: {
        lease
      }
    });
  } catch (error) {
    console.error("Failed to fetch tenant lease", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch tenant lease"
    });
  }
}

import { extractTenantSessionFromRequest } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../api/shared";
import { createPaymentRepo, jsonResponse } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repository = createPaymentRepo();

  try {
    const payments = await repository.listPaymentsByTenantAuthUserId(
      access.data.userId,
      access.data.organizationId
    );

    return jsonResponse(200, {
      success: true,
      data: { payments }
    });
  } catch (error) {
    console.error("Failed to fetch tenant payments", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch payments"
    });
  }
}

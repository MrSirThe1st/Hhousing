import { extractTenantSessionFromRequest } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../api/shared";
import { createPaymentRepo, jsonResponse } from "../../shared";
import { buildMobilePaymentDetail } from "./payment-detail";

export async function OPTIONS(request: Request): Promise<Response> {
  return jsonResponse(204, null, request);
}

export async function GET(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access, request);
  }

  const paymentId = new URL(request.url).searchParams.get("id")?.trim() || null;
  const repository = createPaymentRepo();

  try {
    const payments = await repository.listPaymentsByTenantAuthUserId(
      access.data.userId,
      access.data.organizationId
    );

    if (paymentId) {
      const payment = payments.find((item) => item.id === paymentId);
      if (!payment) {
        return jsonResponse(
          404,
          { success: false, code: "NOT_FOUND", error: "Payment not found" },
          request
        );
      }

      const detail = await buildMobilePaymentDetail(access.data.organizationId, payment);
      return jsonResponse(200, { success: true, data: detail }, request);
    }

    return jsonResponse(
      200,
      {
        success: true,
        data: { payments }
      },
      request
    );
  } catch (error) {
    console.error("Failed to fetch tenant payments", error);
    return jsonResponse(
      500,
      {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to fetch payments"
      },
      request
    );
  }
}

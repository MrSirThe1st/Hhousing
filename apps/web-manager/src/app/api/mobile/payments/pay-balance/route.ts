import { extractTenantSessionFromRequest } from "../../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../../api/shared";
import { initiateTenantBalanceDeposit } from "../../../../../api/payments/initiate-tenant-balance-deposit";
import {
  createPaymentRepo,
  createPawapayTransactionRepo,
  createTenantLeaseRepo,
  jsonResponse,
  parseJsonBody
} from "../../../shared";

export async function POST(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  const payload = body as { provider?: unknown; phoneNumber?: unknown };
  const provider = typeof payload.provider === "string" ? payload.provider : "";
  const phoneNumber = typeof payload.phoneNumber === "string" ? payload.phoneNumber : "";

  const result = await initiateTenantBalanceDeposit(
    {
      tenantAuthUserId: access.data.userId,
      organizationId: access.data.organizationId,
      provider,
      phoneNumber
    },
    {
      tenantRepository: createTenantLeaseRepo(),
      paymentRepository: createPaymentRepo(),
      pawapayTransactionRepository: createPawapayTransactionRepo()
    }
  );

  if (!result.success) {
    const status =
      result.code === "VALIDATION_ERROR" || result.code === "PAYMENT_REJECTED"
        ? 400
        : result.code === "NOT_FOUND"
          ? 404
          : result.code === "CONFLICT"
            ? 409
            : 500;

    return jsonResponse(status, result);
  }

  return jsonResponse(200, {
    success: true,
    data: result.data
  });
}

import { createId, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../../../shared";
import { createTenantLoginOtpRepositoryFromEnv } from "@hhousing/data-access";
import { requestTenantLoginOtp } from "../../../../../../api/tenants/tenant-otp";
import { createLoginOtpWhatsAppSenderFromEnv } from "../../../../../../lib/whatsapp/otp";

export async function POST(request: Request): Promise<Response> {
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

  const sendOtpWhatsApp = createLoginOtpWhatsAppSenderFromEnv();
  if (!sendOtpWhatsApp) {
    return jsonResponse(503, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "L'envoi OTP WhatsApp n'est pas configuré (WHATSAPP_LOGIN_OTP_TEMPLATE)."
    });
  }

  const result = await requestTenantLoginOtp(body, {
    tenantRepository: createTenantLeaseRepo(),
    otpRepository: createTenantLoginOtpRepositoryFromEnv(process.env),
    createOtpId: () => createId("otp"),
    sendOtpWhatsApp
  });

  return jsonResponse(result.status, result.body);
}

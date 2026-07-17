import {
  createPaymentRepositoryFromEnv,
  createTenantLeaseRepositoryFromEnv,
  createWhatsAppMessageRepositoryFromEnv
} from "@hhousing/data-access";
import { handleIncomingWhatsAppMessages } from "../../../../lib/whatsapp/inbound";
import {
  processWhatsAppWebhookPayload,
  verifyWhatsAppWebhookRequest
} from "../../../../lib/whatsapp/webhook";

function textResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain"
    }
  });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const verification = verifyWhatsAppWebhookRequest({
    mode: url.searchParams.get("hub.mode"),
    verifyToken: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
    expectedVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
  });

  if (!verification.success) {
    return textResponse(403, "Forbidden");
  }

  return textResponse(200, verification.challenge);
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  try {
    const repository = createWhatsAppMessageRepositoryFromEnv();
    const tenantRepository = createTenantLeaseRepositoryFromEnv(process.env);
    const paymentRepository = createPaymentRepositoryFromEnv(process.env);

    const result = await processWhatsAppWebhookPayload(
      payload as Parameters<typeof processWhatsAppWebhookPayload>[0],
      repository,
      async (messages) =>
        handleIncomingWhatsAppMessages({
          messages: messages ?? [],
          tenantRepository,
          paymentRepository
        })
    );

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    console.error("Failed to process WhatsApp webhook", error);
    return new Response(JSON.stringify({ success: false, error: "Webhook processing failed" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

import { randomUUID } from "crypto";
import { createWhatsAppMessageRepositoryFromEnv } from "@hhousing/data-access";
import { jsonResponse } from "../../../shared";
import { createLoggedWhatsAppSender } from "../../../../../lib/whatsapp/logged-sender";
import { createWhatsAppClientFromEnv, isWhatsAppConfigured } from "../../../../../lib/whatsapp/meta";
import { normalizeWhatsAppPhoneNumber } from "../../../../../lib/whatsapp/phone";
import { WHATSAPP_TEST_TEMPLATE } from "../../../../../lib/whatsapp/templates";

interface SendTestWhatsAppRequestBody {
  organizationId: string;
  to: string;
  tenantId?: string | null;
  templateName?: string;
  languageCode?: string;
  parameters?: string[];
}

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

function formatFailure(error: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return "WhatsApp send failed";
  }

  return error instanceof Error ? error.message : "Unknown error";
}

function buildTemplateComponents(parameters: string[]) {
  return [
    {
      type: "body" as const,
      parameters: parameters.map((text) => ({
        type: "text" as const,
        text
      }))
    }
  ];
}

export async function POST(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return jsonResponse(500, {
      success: false,
      error: "CRON_SECRET is not configured"
    });
  }

  const providedSecret = getBearerToken(request.headers);
  if (providedSecret !== cronSecret) {
    return jsonResponse(401, {
      success: false,
      error: "Unauthorized"
    });
  }

  if (!isWhatsAppConfigured()) {
    return jsonResponse(500, {
      success: false,
      error: "WhatsApp is not configured"
    });
  }

  let body: SendTestWhatsAppRequestBody;
  try {
    body = (await request.json()) as SendTestWhatsAppRequestBody;
  } catch {
    return jsonResponse(400, {
      success: false,
      error: "Invalid JSON body"
    });
  }

  if (!body.organizationId || !body.to) {
    return jsonResponse(400, {
      success: false,
      error: "organizationId and to are required"
    });
  }

  const normalizedPhone = normalizeWhatsAppPhoneNumber(body.to);
  if (!normalizedPhone) {
    return jsonResponse(400, {
      success: false,
      error: "Invalid WhatsApp phone number"
    });
  }

  const templateName = body.templateName ?? WHATSAPP_TEST_TEMPLATE.name;
  const languageCode = body.languageCode ?? WHATSAPP_TEST_TEMPLATE.languageCode;
  const parameters = body.parameters ?? [
    "John Doe",
    "123456",
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  ];

  const client = createWhatsAppClientFromEnv();
  const repository = createWhatsAppMessageRepositoryFromEnv();
  const sendLogged = createLoggedWhatsAppSender({
    sendTemplateMessage: (input) => client.sendTemplateMessage(input),
    repository
  });

  try {
    const result = await sendLogged({
      organizationId: body.organizationId,
      tenantId: body.tenantId ?? null,
      createMessageId: () => randomUUID(),
      to: normalizedPhone,
      templateName,
      languageCode,
      components: buildTemplateComponents(parameters),
      metadata: {
        source: "internal_test_route"
      }
    });

    return jsonResponse(200, {
      success: true,
      data: {
        messageId: result.messageId,
        externalMessageId: result.externalMessageId,
        to: normalizedPhone,
        templateName,
        languageCode
      }
    });
  } catch (error) {
    return jsonResponse(502, {
      success: false,
      error: formatFailure(error)
    });
  }
}

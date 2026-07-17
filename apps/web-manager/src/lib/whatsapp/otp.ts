import { randomUUID } from "crypto";
import { createWhatsAppMessageRepositoryFromEnv } from "@hhousing/data-access";
import { createLoggedWhatsAppSender } from "./logged-sender";
import { createWhatsAppClientFromEnv, isWhatsAppConfigured } from "./meta";
import { getLoginOtpTemplateFromEnv } from "./templates";

export interface SendLoginOtpWhatsAppInput {
  organizationId: string;
  tenantId: string;
  to: string;
  code: string;
  tenantFullName: string;
  createMessageId?: () => string;
}

export type LoginOtpWhatsAppSender = (input: SendLoginOtpWhatsAppInput) => Promise<void>;

export function createLoginOtpWhatsAppSenderFromEnv(): LoginOtpWhatsAppSender | undefined {
  if (!isWhatsAppConfigured()) {
    return undefined;
  }

  const template = getLoginOtpTemplateFromEnv();
  if (!template) {
    return undefined;
  }

  const client = createWhatsAppClientFromEnv();
  const repository = createWhatsAppMessageRepositoryFromEnv();
  const sendLogged = createLoggedWhatsAppSender({
    sendTemplateMessage: (input) => client.sendTemplateMessage(input),
    repository
  });

  return async (input) => {
    const bodyParameters =
      template.bodyParameterCount >= 2
        ? [
            { type: "text" as const, text: input.tenantFullName },
            { type: "text" as const, text: input.code }
          ]
        : [{ type: "text" as const, text: input.code }];

    await sendLogged({
      organizationId: input.organizationId,
      tenantId: input.tenantId,
      createMessageId: input.createMessageId ?? (() => randomUUID()),
      to: input.to,
      templateName: template.name,
      languageCode: template.languageCode,
      components: [
        {
          type: "body",
          parameters: bodyParameters
        }
      ],
      metadata: {
        scenario: "tenant_login_otp"
      }
    });
  };
}

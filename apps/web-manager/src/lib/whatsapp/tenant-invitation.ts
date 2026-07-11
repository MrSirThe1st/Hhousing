import { randomUUID } from "crypto";
import { createWhatsAppMessageRepositoryFromEnv } from "@hhousing/data-access";
import { createLoggedWhatsAppSender } from "./logged-sender";
import { createWhatsAppClientFromEnv, isWhatsAppConfigured } from "./meta";
import { getTenantInvitationTemplateFromEnv } from "./templates";

export interface SendTenantInvitationWhatsAppInput {
  organizationId: string;
  tenantId: string;
  to: string;
  tenantFullName: string;
  organizationName: string;
  activationLink: string;
  createMessageId?: () => string;
}

export type TenantInvitationWhatsAppSender = (
  input: SendTenantInvitationWhatsAppInput
) => Promise<void>;

export function createTenantInvitationWhatsAppSenderFromEnv():
  | TenantInvitationWhatsAppSender
  | undefined {
  if (!isWhatsAppConfigured()) {
    return undefined;
  }

  const template = getTenantInvitationTemplateFromEnv();
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
          parameters: [
            { type: "text", text: input.tenantFullName },
            { type: "text", text: input.organizationName },
            { type: "text", text: input.activationLink }
          ]
        }
      ],
      metadata: {
        scenario: "tenant_invitation"
      }
    });
  };
}

import type {
  SendWhatsAppTemplateMessageInput,
  SendWhatsAppTemplateMessageResult,
  WhatsAppClient,
  WhatsAppClientConfig,
  WhatsAppTemplateMessageSender
} from "./types";
import { WhatsAppApiError, WhatsAppNotConfiguredError } from "./types";

function readWhatsAppConfigFromEnv(): WhatsAppClientConfig {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v25.0";

  if (!accessToken || !phoneNumberId) {
    throw new WhatsAppNotConfiguredError();
  }

  return {
    accessToken,
    phoneNumberId,
    apiVersion
  };
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export function createWhatsAppClient(config: WhatsAppClientConfig): WhatsAppClient {
  const baseUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  return {
    async sendTemplateMessage(
      input: SendWhatsAppTemplateMessageInput
    ): Promise<SendWhatsAppTemplateMessageResult> {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.to,
          type: "template",
          template: {
            name: input.templateName,
            language: { code: input.languageCode },
            components: input.components
          }
        })
      });

      const responseBody = await response.text();
      if (!response.ok) {
        throw new WhatsAppApiError(response.status, responseBody);
      }

      let payload: { messages?: Array<{ id?: string }> };
      try {
        payload = JSON.parse(responseBody) as { messages?: Array<{ id?: string }> };
      } catch {
        throw new WhatsAppApiError(response.status, responseBody);
      }

      const externalMessageId = payload.messages?.[0]?.id;
      if (!externalMessageId) {
        throw new WhatsAppApiError(response.status, responseBody);
      }

      return { externalMessageId };
    }
  };
}

export function createWhatsAppClientFromEnv(): WhatsAppClient {
  return createWhatsAppClient(readWhatsAppConfigFromEnv());
}

export function createWhatsAppTemplateMessageSenderFromEnv(): WhatsAppTemplateMessageSender {
  const client = createWhatsAppClientFromEnv();
  return (input) => client.sendTemplateMessage(input);
}

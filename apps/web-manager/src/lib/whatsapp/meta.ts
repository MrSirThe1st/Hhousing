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

async function postWhatsAppMessage(
  config: WhatsAppClientConfig,
  payload: Record<string, unknown>
): Promise<SendWhatsAppTemplateMessageResult> {
  const baseUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const responseBody = await response.text();
  if (!response.ok) {
    throw new WhatsAppApiError(response.status, responseBody);
  }

  let parsed: { messages?: Array<{ id?: string }> };
  try {
    parsed = JSON.parse(responseBody) as { messages?: Array<{ id?: string }> };
  } catch {
    throw new WhatsAppApiError(response.status, responseBody);
  }

  const externalMessageId = parsed.messages?.[0]?.id;
  if (!externalMessageId) {
    throw new WhatsAppApiError(response.status, responseBody);
  }

  return { externalMessageId };
}

export function createWhatsAppClient(config: WhatsAppClientConfig): WhatsAppClient {
  return {
    async sendTemplateMessage(
      input: SendWhatsAppTemplateMessageInput
    ): Promise<SendWhatsAppTemplateMessageResult> {
      return postWhatsAppMessage(config, {
        messaging_product: "whatsapp",
        to: input.to,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.languageCode },
          components: input.components
        }
      });
    },

    async sendTextMessage(input: { to: string; body: string }): Promise<SendWhatsAppTemplateMessageResult> {
      return postWhatsAppMessage(config, {
        messaging_product: "whatsapp",
        to: input.to,
        type: "text",
        text: { body: input.body }
      });
    },

    async sendInteractiveListMessage(input: {
      to: string;
      bodyText: string;
      buttonText: string;
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    }): Promise<SendWhatsAppTemplateMessageResult> {
      return postWhatsAppMessage(config, {
        messaging_product: "whatsapp",
        to: input.to,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: input.bodyText },
          action: {
            button: input.buttonText,
            sections: input.sections
          }
        }
      });
    },

    async sendFlowMessage(input: {
      to: string;
      bodyText: string;
      flowId: string;
      flowCta: string;
      flowToken: string;
    }): Promise<SendWhatsAppTemplateMessageResult> {
      return postWhatsAppMessage(config, {
        messaging_product: "whatsapp",
        to: input.to,
        type: "interactive",
        interactive: {
          type: "flow",
          body: { text: input.bodyText },
          action: {
            name: "flow",
            parameters: {
              flow_message_version: "3",
              flow_id: input.flowId,
              flow_cta: input.flowCta,
              flow_token: input.flowToken,
              flow_action: "data_exchange"
            }
          }
        }
      });
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

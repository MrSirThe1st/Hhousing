export type WhatsAppTemplateParameter = {
  type: "text";
  text: string;
};

export type WhatsAppTemplateComponent = {
  type: "body";
  parameters: WhatsAppTemplateParameter[];
};

export interface SendWhatsAppTemplateMessageInput {
  to: string;
  templateName: string;
  languageCode: string;
  components?: WhatsAppTemplateComponent[];
}

export interface SendWhatsAppTemplateMessageResult {
  externalMessageId: string;
}

export interface WhatsAppClientConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
}

export type WhatsAppTemplateMessageSender = (
  input: SendWhatsAppTemplateMessageInput
) => Promise<SendWhatsAppTemplateMessageResult>;

export interface WhatsAppClient {
  sendTemplateMessage(input: SendWhatsAppTemplateMessageInput): Promise<SendWhatsAppTemplateMessageResult>;
}

export class WhatsAppApiError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`WHATSAPP_SEND_FAILED:${status}:${responseBody}`);
    this.name = "WhatsAppApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export class WhatsAppNotConfiguredError extends Error {
  constructor() {
    super("WHATSAPP_NOT_CONFIGURED");
    this.name = "WhatsAppNotConfiguredError";
  }
}

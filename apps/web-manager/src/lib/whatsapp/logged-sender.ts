import type {
  CreateWhatsAppMessageRecordInput,
  UpdateWhatsAppMessageStatusInput,
  WhatsAppMessageRepository
} from "@hhousing/data-access";
import type { SendWhatsAppTemplateMessageInput, SendWhatsAppTemplateMessageResult } from "./types";
import { WhatsAppApiError } from "./types";

export interface LoggedWhatsAppSendInput extends SendWhatsAppTemplateMessageInput {
  organizationId: string;
  tenantId?: string | null;
  createMessageId: () => string;
  metadata?: Record<string, unknown> | null;
}

export interface LoggedWhatsAppSendResult extends SendWhatsAppTemplateMessageResult {
  messageId: string;
}

export function createLoggedWhatsAppSender(deps: {
  sendTemplateMessage: (input: SendWhatsAppTemplateMessageInput) => Promise<SendWhatsAppTemplateMessageResult>;
  repository: WhatsAppMessageRepository;
}): (input: LoggedWhatsAppSendInput) => Promise<LoggedWhatsAppSendResult> {
  return async (input) => {
    const recordInput: CreateWhatsAppMessageRecordInput = {
      id: input.createMessageId(),
      organizationId: input.organizationId,
      tenantId: input.tenantId ?? null,
      templateName: input.templateName,
      phoneNumber: input.to,
      metadata: input.metadata ?? null
    };

    const pendingMessage = await deps.repository.createMessage(recordInput);

    try {
      const result = await deps.sendTemplateMessage({
        to: input.to,
        templateName: input.templateName,
        languageCode: input.languageCode,
        components: input.components
      });

      const updateInput: UpdateWhatsAppMessageStatusInput = {
        id: pendingMessage.id,
        status: "sent",
        externalMessageId: result.externalMessageId,
        errorMessage: null
      };
      await deps.repository.updateMessageStatus(updateInput);

      return {
        ...result,
        messageId: pendingMessage.id
      };
    } catch (error) {
      const errorMessage = error instanceof WhatsAppApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "WHATSAPP_SEND_FAILED";

      await deps.repository.updateMessageStatus({
        id: pendingMessage.id,
        status: "failed",
        errorMessage
      });

      throw error;
    }
  };
}

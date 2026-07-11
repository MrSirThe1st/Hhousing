import type { WhatsAppMessage, WhatsAppMessageStatus } from "@hhousing/domain";

export interface CreateWhatsAppMessageRecordInput {
  id: string;
  organizationId: string;
  tenantId?: string | null;
  templateName: string;
  phoneNumber: string;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateWhatsAppMessageStatusInput {
  id: string;
  status: WhatsAppMessageStatus;
  externalMessageId?: string | null;
  errorMessage?: string | null;
}

export interface WhatsAppMessageRepository {
  createMessage(input: CreateWhatsAppMessageRecordInput): Promise<WhatsAppMessage>;
  updateMessageStatus(input: UpdateWhatsAppMessageStatusInput): Promise<WhatsAppMessage | null>;
  getMessageByExternalId(externalMessageId: string): Promise<WhatsAppMessage | null>;
}

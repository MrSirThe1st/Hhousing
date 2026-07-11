export type WhatsAppMessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export interface WhatsAppMessage {
  id: string;
  organizationId: string;
  tenantId: string | null;
  templateName: string;
  phoneNumber: string;
  status: WhatsAppMessageStatus;
  externalMessageId: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAtIso: string;
  updatedAtIso: string;
}

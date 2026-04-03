export type MessageSenderSide = "tenant" | "manager";

export interface Conversation {
  id: string;
  organizationId: string;
  tenantId: string;
  unitId: string;
  leaseId: string | null;
  managerLastReadAtIso: string | null;
  updatedAtIso: string;
  createdAtIso: string;
}

export interface Message {
  id: string;
  organizationId: string;
  conversationId: string;
  senderSide: MessageSenderSide;
  senderUserId: string | null;
  body: string;
  createdAtIso: string;
}

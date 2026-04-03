import type {
  GetManagerConversationDetailOutput,
  ListManagerConversationsFilter,
  ManagerConversationListItem
} from "@hhousing/api-contracts";
import type { Message } from "@hhousing/domain";

export interface StartManagerConversationRecordInput {
  conversationId: string;
  messageId: string;
  organizationId: string;
  tenantId: string;
  unitId?: string;
  senderUserId: string;
  body: string;
}

export interface SendManagerMessageRecordInput {
  messageId: string;
  conversationId: string;
  organizationId: string;
  senderUserId: string;
  body: string;
}

export interface MessageRepository {
  listManagerConversations(filter: ListManagerConversationsFilter): Promise<ManagerConversationListItem[]>;
  getManagerConversationDetail(
    conversationId: string,
    organizationId: string
  ): Promise<GetManagerConversationDetailOutput | null>;
  startManagerConversation(input: StartManagerConversationRecordInput): Promise<string | null>;
  sendManagerMessage(input: SendManagerMessageRecordInput): Promise<Message | null>;
  markManagerConversationRead(conversationId: string, organizationId: string): Promise<void>;
}

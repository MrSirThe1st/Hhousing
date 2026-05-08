import type { LeaseStatus, MessageSenderSide } from "@hhousing/domain";
import type { Message } from "@hhousing/domain";

export interface ListManagerConversationsFilter {
  organizationId: string;
  propertyId?: string;
  q?: string;
}

export interface ManagerConversationListItem {
  conversationId: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  leaseId: string | null;
  lastMessagePreview: string;
  lastMessageAtIso: string;
  unreadCount: number;
}

export interface ListManagerConversationsOutput {
  conversations: ManagerConversationListItem[];
}

export interface ManagerConversationContext {
  tenant: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  unit: {
    id: string;
    unitNumber: string;
    propertyId: string;
    propertyName: string;
  };
  lease: {
    id: string;
    startDate: string;
    endDate: string | null;
    monthlyRentAmount: number;
    currencyCode: string;
    status: LeaseStatus;
  } | null;
}

export interface GetManagerConversationDetailOutput {
  conversation: ManagerConversationListItem;
  messages: Message[];
  context: ManagerConversationContext;
}

export interface StartManagerConversationInput {
  organizationId: string;
  tenantId: string;
  unitId?: string;
  body: string;
}

export interface StartManagerConversationOutput {
  conversationId: string;
}

export interface SendManagerMessageInput {
  conversationId: string;
  organizationId: string;
  body: string;
}

export interface SendManagerMessageOutput {
  message: Message;
}

export interface TenantConversationListItem {
  conversationId: string;
  organizationName: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  leaseId: string | null;
  lastMessagePreview: string;
  lastMessageAtIso: string;
  lastMessageSenderSide: MessageSenderSide;
}

export interface ListTenantConversationsOutput {
  conversations: TenantConversationListItem[];
}

export interface TenantConversationContext {
  unit: {
    id: string;
    unitNumber: string;
    propertyId: string;
    propertyName: string;
  };
  lease: {
    id: string;
    startDate: string;
    endDate: string | null;
    monthlyRentAmount: number;
    currencyCode: string;
    status: LeaseStatus;
  } | null;
}

export interface GetTenantConversationDetailOutput {
  conversation: TenantConversationListItem;
  messages: Message[];
  context: TenantConversationContext;
}

export interface SendTenantMessageInput {
  conversationId: string;
  organizationId: string;
  tenantAuthUserId: string;
  body: string;
}

export interface SendTenantMessageOutput {
  message: Message;
}

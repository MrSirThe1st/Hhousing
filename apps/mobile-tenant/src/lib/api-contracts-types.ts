// API Contract types (inlined to avoid workspace dependency in EAS builds)
// Re-export ApiResult type defined in api-client for convenience
export type { ApiResult } from "./api-client";

export interface LeaseWithTenantView {
  id: string;
  tenantId: string;
  unitId: string;
  propertyId: string;
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  securityDeposit?: number;
  rentalPhotoUrl?: string;
  tenantFirstName?: string;
  tenantLastName?: string;
  propertyAddress?: string;
}

export interface GetTenantConversationDetailOutput {
  id: string;
  participantCount: number;
  lastMessage?: {
    text: string;
    createdAt: string;
  };
}

export interface SendTenantMessageOutput {
  id: string;
  conversationId: string;
  text: string;
  createdAt: string;
}

export interface ListTenantConversationsOutput {
  conversations: Array<{
    id: string;
    lastMessage?: {
      text: string;
      createdAt: string;
    };
  }>;
}

export type TeamInviteRole = "landlord" | "property_manager" | "platform_admin";

export interface InvitePropertyManagerInput {
  email: string;
  role: TeamInviteRole;
}

export interface InvitePropertyManagerOutput {
  success: boolean;
  invitationId: string;
}

export interface CreateTenantInvitationOutput {
  invitationCode: string;
  expiresAt: string;
}

export interface TenantInvitationPreview {
  id: string;
  code?: string;
  unitAddress?: string;
  monthlyRent?: number;
  propertyName?: string;
  expiresAt?: string;
}

export interface ValidateTenantInvitationOutput {
  valid: boolean;
  unitAddress?: string;
  monthlyRent?: number;
  invitation?: TenantInvitationPreview;
}

export interface AcceptTenantInvitationInput {
  invitationCode: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface AcceptTenantInvitationOutput {
  success: boolean;
}

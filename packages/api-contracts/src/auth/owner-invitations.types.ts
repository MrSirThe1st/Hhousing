export interface CreateOwnerInvitationInput {
  organizationId: string;
  ownerId: string;
  email: string;
}

export interface CreateOwnerInvitationOutput {
  invitationId: string;
  ownerId: string;
  email: string;
  expiresAtIso: string;
  activationLink: string;
}

export interface OwnerInvitationPreview {
  invitationId: string;
  ownerId: string;
  organizationId: string;
  ownerName: string;
  organizationName: string;
  email: string;
  expiresAtIso: string;
  accountExists: boolean;
}

export interface ValidateOwnerInvitationOutput {
  invitation: OwnerInvitationPreview;
}

export interface AcceptOwnerInvitationInput {
  token: string;
  fullName?: string;
  password?: string;
}

export interface AcceptOwnerInvitationOutput {
  userId: string;
  ownerId: string;
  organizationId: string;
  accessId: string;
}

import type { OrganizationMembership, TeamMemberInvitation } from "@hhousing/domain";

export type TeamInviteRole = "property_manager";

export interface ListOrganizationMembersOutput {
  memberships: OrganizationMembership[];
}

export interface ListTeamMemberInvitationsOutput {
  invitations: TeamMemberInvitation[];
}

export interface InvitePropertyManagerInput {
  organizationId: string;
  email: string;
  role: TeamInviteRole;
  canOwnProperties: boolean;
}

export interface InvitePropertyManagerOutput {
  invitationId: string;
  email: string;
  role: TeamInviteRole;
  canOwnProperties: boolean;
  expiresAtIso: string;
  activationLink: string;
}

export interface TeamMemberInvitationPreview {
  invitationId: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: TeamInviteRole;
  canOwnProperties: boolean;
  expiresAtIso: string;
}

export interface ValidateTeamMemberInvitationOutput {
  invitation: TeamMemberInvitationPreview;
}

export interface AcceptTeamMemberInvitationInput {
  token: string;
  fullName: string;
  password: string;
}

export interface AcceptTeamMemberInvitationOutput {
  userId: string;
  organizationId: string;
  membershipId: string;
}

export interface LookupUserByEmailInput {
  email: string;
}

export interface LookupUserByEmailOutput {
  userId: string;
  email: string;
}

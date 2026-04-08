export type TeamMemberInvitationRole = "property_manager";

export interface TeamMemberInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: TeamMemberInvitationRole;
  canOwnProperties: boolean;
  expiresAtIso: string;
  usedAtIso: string | null;
  revokedAtIso: string | null;
  createdAtIso: string;
}
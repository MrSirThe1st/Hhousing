import type { Organization, OrganizationMembership, TeamMemberInvitation, TeamMemberInvitationRole, UserRole } from "@hhousing/domain";

export interface CreateOperatorAccountRecordInput {
  organizationId: string;
  organizationName: string;
  membershipId: string;
  userId: string;
  role: UserRole;
  canOwnProperties: boolean;
}

export interface CreateOperatorAccountRecordOutput {
  organization: Organization;
  membership: OrganizationMembership;
}

export interface CreateOrganizationMembershipRecordInput {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  status: "active" | "invited" | "inactive";
  canOwnProperties: boolean;
}

export interface CreateTeamMemberInvitationRecordInput {
  id: string;
  organizationId: string;
  email: string;
  role: TeamMemberInvitationRole;
  canOwnProperties: boolean;
  tokenHash: string;
  expiresAtIso: string;
  createdByUserId: string;
}

export interface TeamMemberInvitationPreviewRecord {
  invitationId: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: TeamMemberInvitationRole;
  canOwnProperties: boolean;
  expiresAtIso: string;
}

export interface AuthRepository {
  listMembershipsByUserId(userId: string): Promise<OrganizationMembership[]>;
  listMembershipsByOrganization(organizationId: string): Promise<OrganizationMembership[]>;
  getMembershipByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembership | null>;
  getMembershipById(membershipId: string): Promise<OrganizationMembership | null>;
  createOrganizationMembership(input: CreateOrganizationMembershipRecordInput): Promise<OrganizationMembership>;
  listTeamMemberInvitationsByOrganization(organizationId: string): Promise<TeamMemberInvitation[]>;
  revokeActiveTeamMemberInvitations(email: string, organizationId: string): Promise<void>;
  createTeamMemberInvitation(input: CreateTeamMemberInvitationRecordInput): Promise<TeamMemberInvitation>;
  getTeamMemberInvitationPreviewByTokenHash(tokenHash: string): Promise<TeamMemberInvitationPreviewRecord | null>;
  markTeamMemberInvitationUsed(invitationId: string): Promise<void>;
  createOperatorAccount(
    input: CreateOperatorAccountRecordInput
  ): Promise<CreateOperatorAccountRecordOutput>;
}
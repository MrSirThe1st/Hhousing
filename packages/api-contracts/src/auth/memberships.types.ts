import type { OrganizationMembership } from "@hhousing/domain";
import type { TeamFunctionCode } from "../permissions.types";

export type TeamInviteRole = "property_manager" | "landlord";

export interface ListOrganizationMembersOutput {
  memberships: OrganizationMembership[];
}

export interface InvitePropertyManagerInput {
  organizationId: string;
  userId: string;
  role: TeamInviteRole;
  canOwnProperties: boolean;
  functions?: TeamFunctionCode[]; // Optional: assign functions on invite. Defaults to full access for now.
}

export type InvitePropertyManagerOutput = OrganizationMembership;

export interface LookupUserByEmailInput {
  email: string;
}

export interface LookupUserByEmailOutput {
  userId: string;
  email: string;
}

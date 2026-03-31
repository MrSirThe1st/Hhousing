import type { Organization, OrganizationMembership, UserRole } from "@hhousing/domain";

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

export interface AuthRepository {
  listMembershipsByUserId(userId: string): Promise<OrganizationMembership[]>;
  listMembershipsByOrganization(organizationId: string): Promise<OrganizationMembership[]>;
  getMembershipByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembership | null>;
  createOrganizationMembership(input: CreateOrganizationMembershipRecordInput): Promise<OrganizationMembership>;
  createOperatorAccount(
    input: CreateOperatorAccountRecordInput
  ): Promise<CreateOperatorAccountRecordOutput>;
}
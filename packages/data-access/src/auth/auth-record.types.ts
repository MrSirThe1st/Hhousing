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

export interface AuthRepository {
  listMembershipsByUserId(userId: string): Promise<OrganizationMembership[]>;
  getMembershipByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembership | null>;
  createOperatorAccount(
    input: CreateOperatorAccountRecordInput
  ): Promise<CreateOperatorAccountRecordOutput>;
}
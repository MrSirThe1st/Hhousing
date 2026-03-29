import type { Organization, OrganizationMembership } from "@hhousing/domain";

export type OperatorAccountType =
  | "self_managed_owner"
  | "manager_for_others"
  | "mixed_operator"
  | "tenant";

export interface CreateOperatorAccountInput {
  organizationName: string;
  accountType: OperatorAccountType;
}

export interface CreateOperatorAccountOutput {
  organization: Organization;
  membership: OrganizationMembership;
}
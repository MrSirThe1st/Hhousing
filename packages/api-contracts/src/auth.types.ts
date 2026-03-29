import type {
  MembershipCapabilities,
  OrganizationMembership,
  UserRole
} from "@hhousing/domain";

export type { MembershipCapabilities, OrganizationMembership, UserRole } from "@hhousing/domain";

export interface AuthSession {
  userId: string;
  role: UserRole;
  organizationId: string;
  capabilities: MembershipCapabilities;
  memberships: OrganizationMembership[];
}

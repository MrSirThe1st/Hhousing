import type {
  MembershipCapabilities,
  OrganizationMembership,
  UserRole
} from "@hhousing/domain";

export type { MembershipCapabilities, OrganizationMembership, UserRole } from "@hhousing/domain";

type AuthSessionBase = {
  userId: string;
  capabilities: MembershipCapabilities;
  memberships: OrganizationMembership[];
};

/** Platform admin: cross-org SaaS ops, no organization context. */
export type PlatformAdminAuthSession = AuthSessionBase & {
  role: "platform_admin";
  organizationId: null;
};

/** Tenant or operator: always scoped to an organization membership. */
export type MembershipAuthSession = AuthSessionBase & {
  role: Exclude<UserRole, "platform_admin">;
  organizationId: string;
};

export type AuthSession = PlatformAdminAuthSession | MembershipAuthSession;

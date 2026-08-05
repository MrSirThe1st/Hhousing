import {
  createAuthRepositoryFromEnv,
  createOrganizationPropertyUnitRepositoryFromEnv,
  createPlatformAdminRepositoryFromEnv
} from "@hhousing/data-access";
import type { AuthSession, MembershipAuthSession, PlatformAdminAuthSession } from "@hhousing/api-contracts";

/**
 * Resolve AuthSession for an authenticated Supabase user id.
 * Handles platform admins (no org membership), suspended accounts, and suspended orgs.
 */
export async function resolveAuthSessionForUserId(userId: string): Promise<AuthSession | null> {
  try {
    const platformRepo = createPlatformAdminRepositoryFromEnv(process.env);

    if (await platformRepo.isUserSuspended(userId)) {
      return null;
    }

    if (await platformRepo.isActivePlatformAdmin(userId)) {
      const session: PlatformAdminAuthSession = {
        userId,
        role: "platform_admin",
        organizationId: null,
        capabilities: { canOwnProperties: false },
        memberships: []
      };
      return session;
    }

    const authRepo = createAuthRepositoryFromEnv(process.env);
    const memberships = await authRepo.listMembershipsByUserId(userId);

    if (memberships.length === 0) {
      return null;
    }

    const orgRepoResult = createOrganizationPropertyUnitRepositoryFromEnv(process.env);
    let usable = memberships;

    if (orgRepoResult.success) {
      const activeMemberships = [];
      for (const membership of memberships) {
        const organization = await orgRepoResult.data.getOrganizationById(membership.organizationId);
        if (organization === null || organization.status !== "suspended") {
          activeMemberships.push(membership);
        }
      }
      usable = activeMemberships;
    }

    if (usable.length === 0) {
      return null;
    }

    const primary = usable[0];
    if (!primary || primary.role === "platform_admin") {
      return null;
    }

    const session: MembershipAuthSession = {
      userId,
      role: primary.role,
      organizationId: primary.organizationId,
      capabilities: primary.capabilities,
      memberships
    };
    return session;
  } catch (error) {
    console.error("Failed to resolve auth session for user", error);
    return null;
  }
}

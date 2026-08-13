import { cache } from "react";
import {
  createAuthRepositoryFromEnv,
  createMarketplaceRepositoryFromEnv,
  createOrganizationPropertyUnitRepositoryFromEnv,
  createPlatformAdminRepositoryFromEnv
} from "@hhousing/data-access";
import type {
  AuthSession,
  MarketplaceAuthSession,
  MembershipAuthSession,
  PlatformAdminAuthSession
} from "@hhousing/api-contracts";

/**
 * Resolve AuthSession for an authenticated Supabase user id.
 * Handles platform admins (no org membership), marketplace seekers,
 * suspended accounts, and suspended orgs.
 * Request-scoped via React cache so layout/page/API helpers share one resolution.
 */
export const resolveAuthSessionForUserId = cache(async function resolveAuthSessionForUserId(
  userId: string
): Promise<AuthSession | null> {
  try {
    const platformRepo = createPlatformAdminRepositoryFromEnv(process.env);

    const [suspended, isPlatformAdmin] = await Promise.all([
      platformRepo.isUserSuspended(userId),
      platformRepo.isActivePlatformAdmin(userId)
    ]);

    if (suspended) {
      return null;
    }

    if (isPlatformAdmin) {
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

    if (memberships.length > 0) {
      const orgRepoResult = createOrganizationPropertyUnitRepositoryFromEnv(process.env);
      let usable = memberships;

      if (orgRepoResult.success) {
        const organizations = await Promise.all(
          memberships.map((membership) =>
            orgRepoResult.data.getOrganizationById(membership.organizationId)
          )
        );
        usable = memberships.filter((_membership, index) => {
          const organization = organizations[index];
          return organization === null || organization.status !== "suspended";
        });
      }

      if (usable.length > 0) {
        const primary = usable[0];
        if (primary && primary.role !== "platform_admin") {
          const session: MembershipAuthSession = {
            userId,
            role: primary.role,
            organizationId: primary.organizationId,
            capabilities: primary.capabilities,
            memberships
          };
          return session;
        }
      }
    }

    const marketplaceRepo = createMarketplaceRepositoryFromEnv(process.env);
    const marketplaceProfile = await marketplaceRepo.getProfileByUserId(userId);
    if (marketplaceProfile) {
      const session: MarketplaceAuthSession = {
        userId,
        role: "marketplace_user",
        organizationId: null,
        capabilities: { canOwnProperties: false },
        memberships: []
      };
      return session;
    }

    return null;
  } catch (error) {
    console.error("Failed to resolve auth session for user", error);
    return null;
  }
});

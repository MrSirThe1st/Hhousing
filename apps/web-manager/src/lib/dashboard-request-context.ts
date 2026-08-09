import { cache } from "react";
import type { MembershipAuthSession } from "@hhousing/api-contracts";
import type { Organization } from "@hhousing/domain";
import { createRepositoryFromEnv } from "../app/api/shared";
import { resolveDashboardAccess, type DashboardAccess } from "./dashboard-access";
import { getServerAuthSession } from "./session";

export type DashboardRequestContext = {
  session: MembershipAuthSession;
  access: DashboardAccess;
  organization: Organization | null;
};

/**
 * Request-scoped dashboard context. Memoized with React cache() and no arguments
 * so layout + page + loaders share one resolution per RSC request.
 *
 * Does not change auth/scoping rules — only deduplicates work already done by
 * getServerAuthSession + resolveDashboardAccess + getOrganizationById.
 */
export const getDashboardRequestContext = cache(async function getDashboardRequestContext(): Promise<DashboardRequestContext | null> {
  const session = await getServerAuthSession();
  if (session === null) {
    return null;
  }

  if (session.role === "tenant" || session.role === "platform_admin" || !session.organizationId) {
    return null;
  }

  const membershipSession = session as MembershipAuthSession;
  const propertyRepo = createRepositoryFromEnv();

  const [access, organization] = await Promise.all([
    resolveDashboardAccess(membershipSession),
    propertyRepo.success
      ? propertyRepo.data.getOrganizationById(membershipSession.organizationId)
      : Promise.resolve(null as Organization | null)
  ]);

  return {
    session: membershipSession,
    access,
    organization
  };
});

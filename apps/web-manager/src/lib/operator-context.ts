import { cache } from "react";
import type { MembershipAuthSession } from "@hhousing/api-contracts";
import { createAuthRepositoryFromEnv } from "@hhousing/data-access";
import { createRepositoryFromEnv } from "../app/api/shared";
import { getDashboardRequestContext } from "./dashboard-request-context";
import type { OperatorContext } from "./operator-context.types";

export type { OperatorContext, PlatformExperience } from "./operator-context.types";
export { isEntrepriseExperience, isIndividualExperience } from "./platform-experience";

export async function isAccountOwner(session: MembershipAuthSession): Promise<boolean> {
  if (!session.organizationId) {
    return false;
  }

  const currentMembership = session.memberships.find(
    (membership) => membership.organizationId === session.organizationId
  );
  if (!currentMembership) {
    return false;
  }

  const operatorMemberships = (await createAuthRepositoryFromEnv(process.env).listMembershipsByOrganization(session.organizationId))
    .filter((membership) => membership.role === "landlord" || membership.role === "property_manager")
    .sort(
      (left, right) =>
        new Date(left.createdAtIso).getTime() - new Date(right.createdAtIso).getTime()
    );

  const accountOwnerMembership = operatorMemberships[0] ?? null;
  return accountOwnerMembership?.id === currentMembership.id;
}

export const getServerOperatorContext = cache(async function getServerOperatorContext(
  session: MembershipAuthSession
): Promise<OperatorContext> {
  if (!session.organizationId) {
    return { experience: "entreprise" };
  }

  // Reuse org already loaded by dashboard layout when present (same RSC request).
  const dashboardContext = await getDashboardRequestContext();
  if (
    dashboardContext?.organization &&
    dashboardContext.session.organizationId === session.organizationId
  ) {
    return {
      experience: dashboardContext.organization.platformExperience ?? "entreprise"
    };
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return { experience: "entreprise" };
  }

  const organization = await repositoryResult.data.getOrganizationById(session.organizationId);
  return {
    experience: organization?.platformExperience ?? "entreprise"
  };
});

export function getOperatorScopeLabel(): string {
  return "Tous mes biens";
}

export function canEditOrganizationDetails(session: MembershipAuthSession): boolean {
  return session.role === "property_manager";
}

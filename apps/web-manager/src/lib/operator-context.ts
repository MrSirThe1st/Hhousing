import type { AuthSession } from "@hhousing/api-contracts";
import { createAuthRepositoryFromEnv } from "@hhousing/data-access";
import { createRepositoryFromEnv } from "../app/api/shared";
import type { OperatorContext } from "./operator-context.types";

export type { OperatorContext, PlatformExperience } from "./operator-context.types";
export { isEntrepriseExperience, isIndividualExperience } from "./platform-experience";

export async function isAccountOwner(session: AuthSession): Promise<boolean> {
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

export async function getServerOperatorContext(session: AuthSession): Promise<OperatorContext> {
  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return { experience: "entreprise" };
  }

  const organization = await repositoryResult.data.getOrganizationById(session.organizationId);
  return {
    experience: organization?.platformExperience ?? "entreprise"
  };
}

export function getOperatorScopeLabel(): string {
  return "Portefeuille";
}

export function canEditOrganizationDetails(session: AuthSession): boolean {
  return session.role === "property_manager";
}

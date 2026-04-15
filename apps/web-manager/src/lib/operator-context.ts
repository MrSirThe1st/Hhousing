import type { AuthSession } from "@hhousing/api-contracts";
import type { OperatorContext, OperatorExperience } from "./operator-context.types";

export function getOperatorExperience(session: AuthSession): OperatorExperience {
  if (session.role === "landlord") {
    return "self_managed_owner";
  }

  if (session.capabilities.canOwnProperties) {
    return "mixed_operator";
  }

  return "manager_for_others";
}

export function resolveOperatorContext(session: AuthSession): OperatorContext {
  return {
    experience: getOperatorExperience(session)
  };
}

export async function getServerOperatorContext(session: AuthSession): Promise<OperatorContext> {
  return resolveOperatorContext(session);
}

export function getOperatorScopeLabel(): string {
  return "Portefeuille";
}

export function canEditOrganizationDetails(session: AuthSession): boolean {
  const experience = getOperatorExperience(session);
  return experience === "manager_for_others" || experience === "mixed_operator";
}
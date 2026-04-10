import type { AuthSession } from "@hhousing/api-contracts";
import { cookies } from "next/headers";
import type { OperatorContext, OperatorExperience, OperatorScope } from "./operator-context.types";

export const OPERATOR_SCOPE_COOKIE = "hh_operator_scope";

export function isOperatorScope(value: unknown): value is OperatorScope {
  return value === "owned" || value === "managed";
}

export function getOperatorExperience(session: AuthSession): OperatorExperience {
  if (session.role === "landlord") {
    return "self_managed_owner";
  }

  if (session.capabilities.canOwnProperties) {
    return "mixed_operator";
  }

  return "manager_for_others";
}

export function getAvailableOperatorScopes(session: AuthSession): OperatorScope[] {
  void session;
  return ["owned"];
}

export function getDefaultOperatorScope(session: AuthSession): OperatorScope {
  void session;
  return "owned";
}

export function resolveOperatorContext(session: AuthSession, requestedScope?: string | null): OperatorContext {
  void requestedScope;
  const availableScopes = getAvailableOperatorScopes(session);
  const currentScope = getDefaultOperatorScope(session);

  return {
    experience: getOperatorExperience(session),
    availableScopes,
    currentScope,
    canSwitch: false
  };
}

export async function getServerOperatorContext(session: AuthSession): Promise<OperatorContext> {
  const cookieStore = await cookies();
  const requestedScope = cookieStore.get(OPERATOR_SCOPE_COOKIE)?.value ?? null;
  return resolveOperatorContext(session, requestedScope);
}

export function getOperatorScopeLabel(scope: OperatorScope): string {
  void scope;
  return "Portefeuille";
}

export function canEditOrganizationDetails(session: AuthSession): boolean {
  const experience = getOperatorExperience(session);
  return experience === "manager_for_others" || experience === "mixed_operator";
}

export function isScopeAllowedForSession(session: AuthSession, scope: OperatorScope): boolean {
  void session;
  void scope;
  return true;
}
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
  if (session.role === "landlord") {
    return ["owned"];
  }

  if (session.capabilities.canOwnProperties) {
    return ["owned", "managed"];
  }

  return ["managed"];
}

export function getDefaultOperatorScope(session: AuthSession): OperatorScope {
  const availableScopes = getAvailableOperatorScopes(session);
  return availableScopes[0] ?? "managed";
}

export function resolveOperatorContext(session: AuthSession, requestedScope?: string | null): OperatorContext {
  const availableScopes = getAvailableOperatorScopes(session);
  const defaultScope = getDefaultOperatorScope(session);
  const currentScope = requestedScope && isOperatorScope(requestedScope) && availableScopes.includes(requestedScope)
    ? requestedScope
    : defaultScope;

  return {
    experience: getOperatorExperience(session),
    availableScopes,
    currentScope,
    canSwitch: availableScopes.length > 1
  };
}

export async function getServerOperatorContext(session: AuthSession): Promise<OperatorContext> {
  const cookieStore = await cookies();
  const requestedScope = cookieStore.get(OPERATOR_SCOPE_COOKIE)?.value ?? null;
  return resolveOperatorContext(session, requestedScope);
}

export function getOperatorScopeLabel(scope: OperatorScope): string {
  return scope === "owned" ? "Mon parc" : "Parc gere";
}

export function isScopeAllowedForSession(session: AuthSession, scope: OperatorScope): boolean {
  return getAvailableOperatorScopes(session).includes(scope);
}
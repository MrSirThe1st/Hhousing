import { redirect } from "next/navigation";
import { Permission, type AuthSession } from "@hhousing/api-contracts";
import {
  createAuthRepositoryFromEnv,
  createTeamFunctionsRepositoryFromEnv
} from "@hhousing/data-access";
import { getServerAuthSession } from "./session";

export type DashboardSection = "dashboard" | "operations" | "finances" | "services" | "organization" | "audit";

export interface DashboardAccess {
  dashboard: boolean;
  operations: boolean;
  finances: boolean;
  services: boolean;
  organization: boolean;
  audit: boolean;
  manageOrganization: boolean;
  isFoundingManager: boolean;
  operationsWritable: boolean;
  financesWritable: boolean;
  servicesWritable: boolean;
}

function hasPermission(permissions: string[], permission: Permission): boolean {
  return permissions.includes("*") || permissions.includes(permission);
}

function getEmptyAccess(): DashboardAccess {
  return {
    dashboard: false,
    operations: false,
    finances: false,
    services: false,
    organization: false,
    audit: false,
    manageOrganization: false,
    isFoundingManager: false,
    operationsWritable: false,
    financesWritable: false,
    servicesWritable: false
  };
}

function getFullOperatorAccess(isAccountOwner: boolean): DashboardAccess {
  return {
    dashboard: true,
    operations: true,
    finances: true,
    services: true,
    organization: true,
    audit: isAccountOwner,
    manageOrganization: isAccountOwner,
    isFoundingManager: isAccountOwner,
    operationsWritable: true,
    financesWritable: true,
    servicesWritable: true
  };
}

function getAccessFromPermissions(permissions: string[], isAccountOwner: boolean): DashboardAccess {
  const isOperator = permissions.length > 0;
  const manageOrganization =
    isAccountOwner || hasPermission(permissions, Permission.MANAGE_ORG) || hasPermission(permissions, Permission.MANAGE_TEAM);

  const operationsWritable =
    isAccountOwner ||
    hasPermission(permissions, Permission.MANAGE_PROPERTIES) ||
    hasPermission(permissions, Permission.MANAGE_TENANTS) ||
    hasPermission(permissions, Permission.CREATE_LEASE) ||
    hasPermission(permissions, Permission.EDIT_LEASE);

  const financesWritable =
    isAccountOwner ||
    hasPermission(permissions, Permission.RECORD_PAYMENT);

  const servicesWritable =
    isAccountOwner ||
    hasPermission(permissions, Permission.MANAGE_MAINTENANCE) ||
    hasPermission(permissions, Permission.UPDATE_MAINTENANCE_STATUS) ||
    hasPermission(permissions, Permission.UPLOAD_DOCUMENTS);

  return {
    dashboard: isOperator,
    operations: isOperator,
    finances: isOperator,
    services: isOperator,
    organization: isOperator,
    audit: isAccountOwner,
    manageOrganization,
    isFoundingManager: isAccountOwner,
    operationsWritable,
    financesWritable,
    servicesWritable
  };
}

export async function resolveDashboardAccess(session: AuthSession): Promise<DashboardAccess> {
  if (session.role === "tenant") {
    return getEmptyAccess();
  }

  const authRepository = createAuthRepositoryFromEnv(process.env);
  const organizationMemberships = await authRepository.listMembershipsByOrganization(session.organizationId);
  const operatorMemberships = organizationMemberships
    .filter((membership) => membership.role === "landlord" || membership.role === "property_manager")
    .sort((left, right) => new Date(left.createdAtIso).getTime() - new Date(right.createdAtIso).getTime());
  const isAccountOwner = operatorMemberships[0]?.userId === session.userId;

  if (session.role !== "landlord" && session.role !== "property_manager") {
    return getEmptyAccess();
  }

  const currentMembership = session.memberships.find((item) => item.organizationId === session.organizationId);
  if (!currentMembership) {
    return isAccountOwner ? getFullOperatorAccess(true) : getEmptyAccess();
  }

  const teamFunctionsRepository = createTeamFunctionsRepositoryFromEnv(process.env);
  let functions = [] as Awaited<ReturnType<typeof teamFunctionsRepository.listMemberFunctions>>;
  try {
    functions = await teamFunctionsRepository.listMemberFunctions(currentMembership.id);
  } catch (error) {
    const maybeCode = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
    if (maybeCode !== "42P01") {
      throw error;
    }
  }

  if (functions.length === 0) {
    return isAccountOwner ? getFullOperatorAccess(true) : getEmptyAccess();
  }

  const mergedPermissions = functions.flatMap((teamFunction) => teamFunction.permissions);
  return getAccessFromPermissions(mergedPermissions, isAccountOwner);
}

export async function requireDashboardSectionAccess(section: DashboardSection): Promise<{
  session: AuthSession;
  access: DashboardAccess;
}> {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role === "tenant") {
    redirect("/account-type");
  }

  const access = await resolveDashboardAccess(session);
  if (!access[section]) {
    redirect("/dashboard");
  }

  return { session, access };
}

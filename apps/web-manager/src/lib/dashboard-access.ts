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
    isFoundingManager: false
  };
}

function getAccessFromPermissions(permissions: string[], isFoundingManager: boolean): DashboardAccess {
  const operations =
    hasPermission(permissions, Permission.VIEW_PROPERTIES) ||
    hasPermission(permissions, Permission.MANAGE_PROPERTIES) ||
    hasPermission(permissions, Permission.VIEW_LEASE) ||
    hasPermission(permissions, Permission.CREATE_LEASE) ||
    hasPermission(permissions, Permission.EDIT_LEASE) ||
    hasPermission(permissions, Permission.VIEW_TENANTS) ||
    hasPermission(permissions, Permission.MANAGE_TENANTS);

  const finances =
    hasPermission(permissions, Permission.VIEW_PAYMENTS) ||
    hasPermission(permissions, Permission.RECORD_PAYMENT) ||
    hasPermission(permissions, Permission.EXPORT_PAYMENT_REPORTS) ||
    hasPermission(permissions, Permission.VIEW_INCOME_REPORTS) ||
    hasPermission(permissions, Permission.VIEW_REPORTS);

  const services =
    hasPermission(permissions, Permission.VIEW_MAINTENANCE) ||
    hasPermission(permissions, Permission.MANAGE_MAINTENANCE) ||
    hasPermission(permissions, Permission.UPDATE_MAINTENANCE_STATUS) ||
    hasPermission(permissions, Permission.ASSIGN_VENDORS) ||
    hasPermission(permissions, Permission.VIEW_DOCUMENTS) ||
    hasPermission(permissions, Permission.UPLOAD_DOCUMENTS);

  const organization = permissions.length > 0;
  const manageOrganization =
    isFoundingManager || hasPermission(permissions, Permission.MANAGE_ORG) || hasPermission(permissions, Permission.MANAGE_TEAM);

  return {
    dashboard: operations || finances || services || organization,
    operations,
    finances,
    services,
    organization,
    audit: isFoundingManager,
    manageOrganization,
    isFoundingManager
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
  const isFoundingManager = operatorMemberships[0]?.userId === session.userId;

  if (session.role === "landlord") {
    return {
      dashboard: true,
      operations: true,
      finances: true,
      services: true,
      organization: true,
      audit: isFoundingManager,
      manageOrganization: true,
      isFoundingManager
    };
  }

  if (session.role !== "property_manager") {
    return getEmptyAccess();
  }

  const currentMembership = session.memberships.find((item) => item.organizationId === session.organizationId);
  if (!currentMembership) {
    return {
      dashboard: true,
      operations: true,
      finances: true,
      services: true,
      organization: true,
      audit: isFoundingManager,
      manageOrganization: true,
      isFoundingManager
    };
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
    return {
      dashboard: true,
      operations: true,
      finances: true,
      services: true,
      organization: true,
      audit: isFoundingManager,
      manageOrganization: true,
      isFoundingManager
    };
  }

  const mergedPermissions = functions.flatMap((teamFunction) => teamFunction.permissions);
  return getAccessFromPermissions(mergedPermissions, isFoundingManager);
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

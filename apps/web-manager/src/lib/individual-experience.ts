import type { PlatformExperience } from "@hhousing/domain";
import { isIndividualExperience } from "./platform-experience";

/** Route prefixes unavailable in particulier mode. */
export const INDIVIDUAL_HIDDEN_ROUTE_PREFIXES = [
  "/dashboard/team",
  "/dashboard/clients",
  "/dashboard/audit",
  "/dashboard/maintenance",
  "/dashboard/listings",
  "/dashboard/move-outs",
  "/dashboard/reports",
  "/dashboard/expenses"
] as const;

export interface IndividualExperienceFeatures {
  emailTemplates: boolean;
  dashboardTasksCalendar: boolean;
  managedPropertyMode: boolean;
  ownerPortalInvites: boolean;
  maintenanceDashboardWidgets: boolean;
  financeReportsWidgets: boolean;
  leaseMoveOut: boolean;
}

export function getIndividualExperienceFeatures(experience: PlatformExperience): IndividualExperienceFeatures {
  if (!isIndividualExperience(experience)) {
    return {
      emailTemplates: true,
      dashboardTasksCalendar: true,
      managedPropertyMode: true,
      ownerPortalInvites: true,
      maintenanceDashboardWidgets: true,
      financeReportsWidgets: true,
      leaseMoveOut: true
    };
  }

  return {
    emailTemplates: false,
    dashboardTasksCalendar: false,
    managedPropertyMode: false,
    ownerPortalInvites: false,
    maintenanceDashboardWidgets: false,
    financeReportsWidgets: false,
    leaseMoveOut: false
  };
}

export function isDashboardPathHiddenInIndividualExperience(pathname: string): boolean {
  const path = pathname.split("?")[0];

  for (const prefix of INDIVIDUAL_HIDDEN_ROUTE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  if (path.includes("/move-out")) {
    return true;
  }

  return false;
}

export function isNavHrefHiddenInIndividualExperience(href: string): boolean {
  return isDashboardPathHiddenInIndividualExperience(href);
}

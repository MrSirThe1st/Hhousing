import type { DashboardCalendarEntry, DashboardWorkflowRelatedOption } from "../lib/dashboard-workflow.types";

export type DashboardCalendarEventTone = "blue" | "amber" | "emerald" | "slate" | "rose";

export type DashboardCalendarProps = {
  organizationId: string;
  currentUserId: string;
  entries: DashboardCalendarEntry[];
  relatedOptions: DashboardWorkflowRelatedOption[];
  scopeLabel: string;
};
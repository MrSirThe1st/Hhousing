import type { CalendarEventType, Task, WorkflowEntityType } from "@hhousing/domain";

export interface DashboardWorkflowRelatedOption {
  type: Extract<WorkflowEntityType, "property" | "unit" | "lease" | "tenant">;
  id: string;
  label: string;
  propertyId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
}

export interface DashboardCalendarEntry {
  id: string;
  title: string;
  detail: string;
  startAtIso: string;
  endAtIso: string | null;
  eventType: CalendarEventType;
  statusLabel: string;
  source: "manual" | "derived" | "task";
  relatedLabel: string | null;
}

export interface DashboardTaskSummary {
  openCount: number;
  inProgressCount: number;
  doneCount: number;
  systemCount: number;
  manualCount: number;
}

export interface DashboardTasksPanelProps {
  organizationId: string;
  currentUserId: string;
  tasks: Task[];
  relatedOptions: DashboardWorkflowRelatedOption[];
}
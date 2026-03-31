export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus = "open" | "in_progress" | "resolved" | "cancelled";

export interface MaintenanceRequest {
  id: string;
  organizationId: string;
  unitId: string;
  tenantId: string | null;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedToName: string | null;
  internalNotes: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null; // ISO datetime
  updatedAtIso: string;
  createdAtIso: string;
}

export type MaintenanceEventType =
  | "created"
  | "status_changed"
  | "assigned"
  | "internal_note_updated"
  | "resolution_note_updated";

export interface MaintenanceTimelineEvent {
  id: string;
  organizationId: string;
  maintenanceRequestId: string;
  eventType: MaintenanceEventType;
  statusFrom: MaintenanceStatus | null;
  statusTo: MaintenanceStatus | null;
  assignedToName: string | null;
  note: string | null;
  createdAtIso: string;
}

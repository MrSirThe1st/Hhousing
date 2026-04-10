import type { WorkflowEntityType } from "./task.types";

export type CalendarEventType = "lease" | "rent" | "maintenance" | "custom" | "inspection" | "reminder" | "task";

export type CalendarEventStatus = "scheduled" | "in_progress" | "done" | "cancelled";

export interface CalendarEvent {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  startAtIso: string;
  endAtIso: string | null;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  assignedUserId: string | null;
  relatedEntityType: WorkflowEntityType | null;
  relatedEntityId: string | null;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
  paymentId: string | null;
  maintenanceRequestId: string | null;
  taskId: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}
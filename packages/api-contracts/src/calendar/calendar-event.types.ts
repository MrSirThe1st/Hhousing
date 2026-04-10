import type { CalendarEvent, CalendarEventStatus, CalendarEventType, WorkflowEntityType } from "@hhousing/domain";

export type { CalendarEventStatus, CalendarEventType } from "@hhousing/domain";

export interface CreateCalendarEventInput {
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
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string | null;
  startAtIso?: string;
  endAtIso?: string | null;
  eventType?: CalendarEventType;
  status?: CalendarEventStatus;
  assignedUserId?: string | null;
  relatedEntityType?: WorkflowEntityType | null;
  relatedEntityId?: string | null;
  propertyId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
}

export interface ListCalendarEventsFilter {
  organizationId: string;
  startAtFrom?: string;
  startAtTo?: string;
  eventType?: CalendarEventType;
}

export interface ListCalendarEventsOutput {
  events: CalendarEvent[];
}

export type CreateCalendarEventOutput = CalendarEvent;

export type UpdateCalendarEventOutput = CalendarEvent;

export interface DeleteCalendarEventOutput {
  success: true;
}
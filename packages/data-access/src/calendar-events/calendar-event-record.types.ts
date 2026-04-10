import type { ListCalendarEventsFilter } from "@hhousing/api-contracts";
import type { CalendarEvent, CalendarEventStatus, CalendarEventType, WorkflowEntityType } from "@hhousing/domain";

export interface CreateCalendarEventRecordInput {
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
}

export interface UpdateCalendarEventRecordInput {
  id: string;
  organizationId: string;
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

export interface CalendarEventRepository {
  createCalendarEvent(input: CreateCalendarEventRecordInput): Promise<CalendarEvent>;
  getCalendarEventById(id: string, organizationId: string): Promise<CalendarEvent | null>;
  listCalendarEvents(filter: ListCalendarEventsFilter): Promise<CalendarEvent[]>;
  updateCalendarEvent(input: UpdateCalendarEventRecordInput): Promise<CalendarEvent | null>;
  deleteCalendarEvent(id: string, organizationId: string): Promise<boolean>;
}